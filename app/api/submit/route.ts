import { after } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { detailsSubmissionSchema, detectAndSanitizeInput } from '@/lib/validations/submission';
import { scrapeWebsite } from '@/lib/scrapers/web';
import { scrapeSocialProfile } from '@/lib/scrapers/social';
import { generateBrandAudit } from '@/lib/ai/gemini';


// FIX 1: Tell Vercel this function can run for up to 300 seconds (requires Pro plan)
// Without this, Vercel kills the function at 10s (Hobby) or 60s (Pro default),
// which is why after() was being silently killed mid-pipeline
export const maxDuration = 300;

// ============================================================
// POST /api/submit — Lead Onboarding Endpoint
// ============================================================

async function runAuditPipeline(leadId: string) {
  const db = getSupabaseAdmin();

  try {
    console.log(`[Pipeline ${leadId}] Starting — fetching lead`);

    const { data: lead, error: leadError } = await db
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      throw new Error(`Failed to fetch lead ${leadId}: ${leadError?.message}`);
    }

    await db.from('leads').update({ 
      status: 'processing',
      pipeline_step: 'scraping'
    }).eq('id', leadId);

    // 1. SCRAPING
    let scrapedText = '';
    let base64Images: string[] = [];
    let rawData: any = {};
    let screenshot_url = '';
    let screenshot_fullpage_url = '';

    console.log(`[Pipeline ${leadId}] Step 1: Starting scrape (type: ${lead.input_type})`);

    if (lead.input_type === 'website' && lead.identifier.startsWith('http')) {
      try {
        const result = await scrapeWebsite(lead.identifier, leadId);
        scrapedText = result.text_content;
        base64Images = [result.screenshot_base64];
        screenshot_url = result.screenshot_url;
        screenshot_fullpage_url = result.screenshot_fullpage_url;
        rawData = result.raw_data;
      } catch (e) {
        console.warn(`[Pipeline] Scrape failed or skipped:`, e);
      }
    } else if (lead.input_type === 'social' && (lead.identifier.startsWith('http') || lead.identifier.startsWith('@'))) {
      try {
        const result = await scrapeSocialProfile(lead.identifier, leadId);
        scrapedText = result.bio + (result.follower_count ? '\nFollowers: ' + result.follower_count : '');
        base64Images = result.recent_images_base64;
        screenshot_url = result.screenshot_url;
        screenshot_fullpage_url = result.screenshot_fullpage_url;
        rawData = result.raw_data;
      } catch (e) {
        console.warn(`[Pipeline] Scrape failed or skipped:`, e);
      }
    } else {
      console.log(`[Pipeline] No valid website or social link provided, skipping scrape for ${lead.identifier}`);
    }

    console.log(`[Pipeline ${leadId}] Step 1 complete — scraped ${scrapedText.length} chars, ${base64Images.length} image(s)`);

    // Save Raw Data & Screenshot URLs
    await db.from('audit_reports').update({ 
      raw_data: rawData,
      screenshot_url,
      screenshot_fullpage_url
    }).eq('lead_id', leadId);

    // 2. AI ANALYSIS
    await db.from('leads').update({ 
      pipeline_step: 'analyzing'
    }).eq('id', leadId);
    console.log(`[Pipeline ${leadId}] Step 2: Starting Gemini analysis`);

    // Retrieve latest lead details in case they submitted details while scraping was running
    const { data: currentLead } = await db
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    const reportContent = await generateBrandAudit({
      brandName: currentLead?.company_name || currentLead?.name || lead.identifier,
      industryOrAudience: currentLead?.industry || lead.industry || 'General Audience',
      websiteText: lead.input_type === 'website' ? scrapedText : undefined,
      instagramText: lead.input_type === 'social' ? scrapedText : undefined,
      base64Images: base64Images.length > 0 ? base64Images : undefined,
    });

    console.log(`[Pipeline ${leadId}] Step 2 complete — Gemini returned report`);

    // Save report content
    await db.from('leads').update({ 
      pipeline_step: 'generating'
    }).eq('id', leadId);
    await db.from('audit_reports').update({
      report_content: reportContent as any,
    }).eq('lead_id', leadId);

    // Pipeline stops here — admin will trigger PDF generation and email sending manually
    await db.from('leads').update({ 
      status: 'awaiting_review',
      pipeline_step: 'complete'
    }).eq('id', leadId);

    console.log(`[Pipeline ${leadId}] Pipeline complete — status set to awaiting_review. Admin will generate PDF and send email.`);

  } catch (pipelineError) {
    console.error(`[Pipeline ${leadId}] Fatal error:`, pipelineError);

    // FIX 2: Defensive nested try — if the DB status update itself fails,
    // we log it without swallowing the original pipeline error
    try {
      await db.from('leads').update({ status: 'failed' }).eq('id', leadId);
      await db
        .from('audit_reports')
        .update({
          error_stage: 'pipeline_execution',
          error_message: pipelineError instanceof Error ? pipelineError.message : String(pipelineError),
        })
        .eq('lead_id', leadId);
    } catch (dbError) {
      console.error(`[Pipeline ${leadId}] Could not update status to failed — DB error:`, dbError);
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parsed = detailsSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, phone, company_name, industry, website, instagram } = parsed.data;

    let identifier = company_name || 'Unknown Brand';
    let input_type: 'website' | 'social' = 'website';
    let cleanIdentifier = identifier;

    if (website) {
      const detected = detectAndSanitizeInput(website);
      identifier = website;
      input_type = detected.type;
      cleanIdentifier = detected.cleanIdentifier;
    } else if (instagram) {
      const detected = detectAndSanitizeInput(instagram);
      identifier = instagram;
      input_type = detected.type;
      cleanIdentifier = detected.cleanIdentifier;
    }

    const supabase = getSupabaseAdmin();

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        name: name || '',
        email: email || '',
        phone: phone || null,
        company_name: company_name || null,
        brand_name: company_name || null,
        industry: industry || null,
        identifier: cleanIdentifier,
        input_type,
        status: 'pending',
        pipeline_step: 'pending',
        pdf_generated: false,
        pdf_sent: false,
      })
      .select('id')
      .single();

    if (leadError || !lead) {
      console.error('[Submit] Lead insert error:', leadError);
      return Response.json(
        { success: false, error: leadError?.message || 'Failed to save your information. Please try again.', details: leadError },
        { status: 500 }
      );
    }

    const { error: reportError } = await supabase
      .from('audit_reports')
      .insert({ lead_id: lead.id });

    if (reportError) {
      console.error('[Submit] Audit report insert error:', reportError);
    }

    after(async () => {
      console.log(`[Pipeline] Scheduling audit for lead ${lead.id} (${input_type}: ${cleanIdentifier})`);
      try {
        await runAuditPipeline(lead.id);
      } catch (err) {
        console.error(`[after()] Unhandled error escaping pipeline for lead ${lead.id}:`, err);
      }
    });

    return Response.json(
      {
        success: true,
        leadId: lead.id,
        message: 'Your brand audit is being prepared!',
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[Submit] Unexpected error:', err);
    return Response.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}