import { GoogleGenAI, Type } from '@google/genai';
import { ReportContent } from '@/lib/types/database';

export interface AuditParams {
  brandName: string;           // MANDATORY
  industryOrAudience: string;  // MANDATORY
  websiteText?: string;        // optional
  instagramText?: string;      // optional
  base64Images?: string[];     // optional
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function generateBrandAudit(params: AuditParams, maxRetries = 3): Promise<ReportContent> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
  }

  const ai = new GoogleGenAI({ apiKey });

  // Filter and cap images to save tokens
  const imageParts = (params.base64Images || [])
    .filter(dataUri => {
      if (!dataUri || !dataUri.includes(',')) return false;
      const base64Data = dataUri.split(',')[1] || '';
      const isUnderLimit = base64Data.length < 500_000;
      if (!isUnderLimit) {
        console.log(`[Gemini] Skipping oversized image (${Math.round(base64Data.length / 1024)}KB) to save tokens`);
      }
      return isUnderLimit;
    })
    .slice(0, 1)
    .map(dataUri => {
      const [header, base64] = dataUri.split(',');
      const mimeType = header.replace('data:', '').replace(';base64', '');
      return { inlineData: { data: base64, mimeType } };
    });

  console.log(`[Gemini] Sending ${imageParts.length} image(s) out of ${(params.base64Images || []).length} provided`);

  // Truncate text inputs to control token usage
  const webText    = params.websiteText    ? params.websiteText.slice(0, 2000)    : null;
  const socialText = params.instagramText  ? params.instagramText.slice(0, 1000)  : null;

  let baseContext = `Brand Name: ${params.brandName}\nIndustry / Target Audience: ${params.industryOrAudience}\n`;
  if (webText) baseContext += `\n--- Website Copy ---\n${webText}`;
  if (socialText) baseContext += `\n--- Social Media Copy ---\n${socialText}`;

  // ==========================================
  // CALL 1: Deep Research with Google Search
  // ==========================================
  
  const call1SystemInstruction = `
You are an elite brand strategist conducting deep research.
Research the brand thoroughly via Google Search.
Search for: brand identity, competitors at regional/national/international level, customer reviews, social media presence, website quality, visual identity, recent news/campaigns.
Return a comprehensive plain text research summary.
  `.trim();

  let researchSummary = '';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Gemini] Call 1: Running deep research via Google Search... (Attempt ${attempt}/${maxRetries})`);
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [{ text: baseContext }, ...imageParts] }
        ],
        config: {
          systemInstruction: call1SystemInstruction,
          tools: [{ googleSearch: {} }],
        }
      });

      if (!response.text) throw new Error('Research call returned empty response');
      researchSummary = response.text;
      console.log(`[Gemini] Call 1 complete. Research summary length: ${researchSummary.length}`);
      break; // Success
    } catch (error: any) {
      const errorCode = error?.status || error?.error?.code;
      const isRetryable = errorCode === 429 || errorCode === 503;
      if (isRetryable && attempt < maxRetries) {
        const waitMs = 5000 * Math.pow(2, attempt - 1);
        console.warn(`[Gemini] Call 1 API error (${errorCode}). Retrying in ${waitMs / 1000}s...`);
        await delay(waitMs);
        continue;
      }
      throw error;
    }
  }

  // ==========================================
  // CALL 2: Structured Output (JSON)
  // ==========================================

  const call2SystemInstruction = `
You are an elite brand strategist at a top consultancy.
Use the research summary from Call 1 as your primary source.
Score the brand's TRUE market equity not scraped content quality.
Every section must be specific, reference real findings, name real competitors.
Never give generic advice — always cite specific evidence.
  `.trim();

  const call2Prompt = `
Based on the following research summary, generate a full 13-section brand audit consultancy report.

--- RESEARCH SUMMARY ---
${researchSummary}
--- END RESEARCH SUMMARY ---

Output exactly in the requested JSON structure.
  `.trim();

  const schema = {
    type: Type.OBJECT,
    properties: {
      scores: {
        type: Type.OBJECT,
        properties: {
          visual_consistency: { type: Type.NUMBER },
          messaging_clarity: { type: Type.NUMBER },
          audience_alignment: { type: Type.NUMBER },
          brand_foundation: { type: Type.NUMBER },
          digital_presence: { type: Type.NUMBER },
          overall: { type: Type.NUMBER, description: 'Global brands (Nike, Apple) = 80-95. Strong regional = 65-79. Average = 45-64. Weak/small = 20-44.' }
        },
        required: ['visual_consistency', 'messaging_clarity', 'audience_alignment', 'brand_foundation', 'digital_presence', 'overall']
      },
      executive_summary: {
        type: Type.STRING,
        description: '3-4 paragraph overview of the brand\'s current state. Cover what they do well, main gaps, top priorities. Brutally honest but constructive tone.'
      },
      brand_foundation: {
        type: Type.OBJECT,
        properties: {
          purpose_statement: { type: Type.STRING },
          mission_vision_values: { type: Type.STRING },
          positioning: { type: Type.STRING },
          target_audience: { type: Type.STRING },
          personality_tone: { type: Type.STRING },
          social_media_signals: { type: Type.STRING },
          what_is_missing: { type: Type.STRING }
        },
        required: ['purpose_statement', 'mission_vision_values', 'positioning', 'target_audience', 'personality_tone', 'social_media_signals', 'what_is_missing']
      },
      competitors: {
        type: Type.OBJECT,
        properties: {
          regional: {
            type: Type.OBJECT,
            properties: {
              competitor_names: { type: Type.ARRAY, items: { type: Type.STRING } },
              how_brand_matches: { type: Type.ARRAY, items: { type: Type.STRING } },
              where_brand_lags: { type: Type.ARRAY, items: { type: Type.STRING } },
              competitive_implications: { type: Type.STRING },
              recommended_priorities: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['competitor_names', 'how_brand_matches', 'where_brand_lags', 'competitive_implications', 'recommended_priorities']
          },
          national: {
            type: Type.OBJECT,
            properties: {
              competitor_names: { type: Type.ARRAY, items: { type: Type.STRING } },
              how_brand_matches: { type: Type.ARRAY, items: { type: Type.STRING } },
              where_brand_lags: { type: Type.ARRAY, items: { type: Type.STRING } },
              competitive_implications: { type: Type.STRING },
              recommended_priorities: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['competitor_names', 'how_brand_matches', 'where_brand_lags', 'competitive_implications', 'recommended_priorities']
          },
          international: {
            type: Type.OBJECT,
            properties: {
              competitor_names: { type: Type.ARRAY, items: { type: Type.STRING } },
              how_brand_matches: { type: Type.ARRAY, items: { type: Type.STRING } },
              where_brand_lags: { type: Type.ARRAY, items: { type: Type.STRING } },
              competitive_implications: { type: Type.STRING },
              recommended_priorities: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['competitor_names', 'how_brand_matches', 'where_brand_lags', 'competitive_implications', 'recommended_priorities']
          }
        },
        required: ['regional', 'national', 'international']
      },
      visual_identity: {
        type: Type.OBJECT,
        properties: {
          logo_usage: { type: Type.STRING },
          logo_impression: { type: Type.STRING },
          colour_palette: { type: Type.STRING },
          typography: { type: Type.STRING },
          imagery_style: { type: Type.STRING },
          overall_brand_system: { type: Type.STRING }
        },
        required: ['logo_usage', 'logo_impression', 'colour_palette', 'typography', 'imagery_style', 'overall_brand_system']
      },
      website_audit: {
        type: Type.OBJECT,
        properties: {
          first_impression: { type: Type.STRING },
          messaging_clarity: { type: Type.STRING },
          tone_consistency: { type: Type.STRING },
          visual_consistency: { type: Type.STRING },
          user_experience: { type: Type.STRING },
          seo_discoverability: { type: Type.STRING },
          ctas_conversion: { type: Type.STRING }
        },
        required: ['first_impression', 'messaging_clarity', 'tone_consistency', 'visual_consistency', 'user_experience', 'seo_discoverability', 'ctas_conversion']
      },
      social_media_audit: {
        type: Type.OBJECT,
        properties: {
          platforms: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                platform: { type: Type.STRING },
                profile_completeness: { type: Type.STRING },
                content_themes: { type: Type.STRING },
                tone_consistency: { type: Type.STRING },
                visual_consistency: { type: Type.STRING },
                engagement_quality: { type: Type.STRING },
                posting_frequency: { type: Type.STRING }
              },
              required: ['platform', 'profile_completeness', 'content_themes', 'tone_consistency', 'visual_consistency', 'engagement_quality', 'posting_frequency']
            }
          },
          cross_platform_summary: { type: Type.STRING }
        },
        required: ['platforms', 'cross_platform_summary']
      },
      content_audit: {
        type: Type.OBJECT,
        properties: {
          content_overview: { type: Type.STRING },
          content_strengths: { type: Type.STRING },
          content_gaps: { type: Type.STRING },
          content_recommendations: { type: Type.STRING }
        },
        required: ['content_overview', 'content_strengths', 'content_gaps', 'content_recommendations']
      },
      verbal_identity: {
        type: Type.OBJECT,
        properties: {
          website_message: { type: Type.STRING },
          social_voice: { type: Type.STRING },
          naming_consistency: { type: Type.STRING },
          employee_story: { type: Type.STRING },
          overall_assessment: { type: Type.STRING }
        },
        required: ['website_message', 'social_voice', 'naming_consistency', 'employee_story', 'overall_assessment']
      },
      audience_perception: {
        type: Type.OBJECT,
        properties: {
          what_customers_say: { type: Type.STRING },
          perceived_strengths: { type: Type.STRING },
          compared_with_competitors: { type: Type.STRING },
          overall_read: { type: Type.STRING }
        },
        required: ['what_customers_say', 'perceived_strengths', 'compared_with_competitors', 'overall_read']
      },
      key_findings: {
        type: Type.OBJECT,
        properties: {
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          inconsistencies: { type: Type.ARRAY, items: { type: Type.STRING } },
          gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
          brand_foundation_summary: { type: Type.STRING },
          audience_tone_summary: { type: Type.STRING },
          competitive_read: { type: Type.STRING }
        },
        required: ['strengths', 'inconsistencies', 'gaps', 'brand_foundation_summary', 'audience_tone_summary', 'competitive_read']
      },
      growth_opportunities: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            opportunity: { type: Type.STRING },
            effort: { type: Type.STRING },
            impact: { type: Type.STRING },
            timeframe: { type: Type.STRING },
            why_now: { type: Type.STRING }
          },
          required: ['opportunity', 'effort', 'impact', 'timeframe', 'why_now']
        }
      },
      priority_action_plan: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            rank: { type: Type.NUMBER },
            action: { type: Type.STRING },
            why: { type: Type.STRING },
            effort: { type: Type.STRING },
            impact: { type: Type.STRING },
            first_step: { type: Type.STRING }
          },
          required: ['rank', 'action', 'why', 'effort', 'impact', 'first_step']
        }
      }
    },
    required: [
      'scores', 'executive_summary', 'brand_foundation', 'competitors', 
      'visual_identity', 'website_audit', 'social_media_audit', 'content_audit',
      'verbal_identity', 'audience_perception', 'key_findings', 
      'growth_opportunities', 'priority_action_plan'
    ]
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Gemini] Call 2: Generating structured JSON... (Attempt ${attempt}/${maxRetries})`);

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: call2Prompt }] }],
        config: {
          temperature: 0.2,
          systemInstruction: call2SystemInstruction,
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });

      if (!response.text) throw new Error('Gemini returned an empty response');

      const result = JSON.parse(response.text) as ReportContent;
      return result;

    } catch (error: any) {
      const errorCode = error?.status || error?.error?.code;
      const isRetryable = errorCode === 429 || errorCode === 503;

      if (isRetryable && attempt < maxRetries) {
        const waitMs = 5000 * Math.pow(2, attempt - 1);
        console.warn(`[Gemini] Call 2 API error (${errorCode}). Retrying in ${waitMs / 1000}s...`);
        await delay(waitMs);
        continue;
      }
      throw error;
    }
  }

  throw new Error('Failed to generate brand audit after maximum retries');
}