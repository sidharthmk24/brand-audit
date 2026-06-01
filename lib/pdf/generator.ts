import { readFileSync, existsSync } from 'fs'
import path from 'path'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import { Lead, ReportContent } from '@/lib/types/database'

// ── Load template assets ─────────────────────────────────────
function loadAsset(filename: string): string {
  try {
    const filePath = path.join(process.cwd(), 'public', 'templates', filename)
    const data = readFileSync(filePath)
    const mime = filename.endsWith('.png') ? 'image/png' : 'application/pdf'
    return `data:${mime};base64,${data.toString('base64')}`
  } catch (e) {
    console.warn(`⚠️  Could not load template asset: ${filename}`, e)
    return ''
  }
}

// ── HTML escape ──────────────────────────────────────────────
function esc(v: string | number | null | undefined): string {
  if (v == null) return ''
  return String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
    .replace(/\n/g, '<br/>')
}

// ── Build the full report HTML ───────────────────────────────
function buildReportHtml(lead: Lead, content: ReportContent): string {
  const score = content.scores?.overall || 0
  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const coverDataUri = loadAsset('cover-clean.png')
  const ringDeg = Math.round((score / 100) * 360)

  const metricRow = (label: string, value: string | number | null, sc?: number) => {
    let color = '#111'
    if (sc !== undefined) {
      color = sc >= 70 ? '#16a34a' : sc >= 45 ? '#ca8a04' : '#dc2626'
    }
    return `
    <div class="metric">
      <span class="m-label">${label}</span>
      <span class="m-val" style="color:${color}">${esc(value)}</span>
    </div>`
  }

  const simpleGrid = (items: {title: string, content: string | undefined}[], highlightMissing?: boolean) => {
    return `<div class="grid-2">
      ${items.map(item => `
        <div class="card ${highlightMissing && item.title === 'What Is Missing' ? 'card-warning' : ''}" style="${item.title === 'What Is Missing' || items.length % 2 !== 0 && item === items[items.length-1] ? 'grid-column: 1 / -1;' : ''}">
          <h3 class="card-title ${highlightMissing && item.title === 'What Is Missing' ? 'text-warning' : ''}">${esc(item.title)}</h3>
          <p class="card-content">${esc(item.content || '—')}</p>
        </div>
      `).join('')}
    </div>`
  }

  let compHtml = '';
  if (content.competitors) {
    (['regional', 'national', 'international'] as const).forEach(level => {
      const c = content.competitors[level];
      if (!c) return;
      compHtml += `
        <div class="card" style="margin-bottom:15pt; break-inside:avoid;">
          <h4 style="margin-bottom:10pt; color:#111; font-weight:800; text-transform:uppercase; font-family:'Inter',sans-serif; font-size:12pt;">${level} Competitors</h4>
          <div style="margin-bottom:12pt;">
            ${(c.competitor_names || []).map(n => `<span class="badge" style="margin-right:6pt;">${esc(n)}</span>`).join('')}
          </div>
          <div class="grid-2" style="margin-bottom:15pt;">
            <div>
              <h4 style="color:#16a34a; font-size:10pt; margin-bottom:6pt; font-family:'Inter',sans-serif;">✓ How Brand Matches</h4>
              <ul class="blist">${(c.how_brand_matches || []).map(m => `<li>${esc(m)}</li>`).join('')}</ul>
            </div>
            <div>
              <h4 style="color:#dc2626; font-size:10pt; margin-bottom:6pt; font-family:'Inter',sans-serif;">✕ Where Brand Lags</h4>
              <ul class="blist">${(c.where_brand_lags || []).map(m => `<li>${esc(m)}</li>`).join('')}</ul>
            </div>
          </div>
          <div style="border-left: 4px solid #9ca3af; padding:10pt; margin-bottom:15pt; background:#f9fafb;">
            <h4 style="font-size:9pt; color:#4b5563; margin-bottom:4pt; text-transform:uppercase; font-family:'Inter',sans-serif;">Competitive Implications</h4>
            <p class="card-content" style="font-size:10pt;">${esc(c.competitive_implications)}</p>
          </div>
          <div style="border: 1px solid #bfdbfe; background:#eff6ff; padding:12pt; border-radius:6pt;">
            <h4 style="color:#1d4ed8; font-size:10pt; margin-bottom:6pt; font-family:'Inter',sans-serif;">Recommended Priorities</h4>
            <ol style="padding-left:16pt; font-size:9.5pt; color:#1e3a8a; line-height:1.6; font-family:'Inter',sans-serif;">
              ${(c.recommended_priorities || []).map(p => `<li style="margin-bottom:4pt;">${esc(p)}</li>`).join('')}
            </ol>
          </div>
        </div>
      `;
    });
  }

  const socialHtml = (content.social_media_audit?.platforms || []).map(p => `
    <div class="card" style="margin-bottom:15pt;">
      <h3 style="font-size:12pt; font-weight:800; border-bottom:1px solid #e5e7eb; padding-bottom:8pt; margin-bottom:12pt; font-family:'Inter',sans-serif;">Platform: ${esc(p.platform)}</h3>
      <div class="grid-2">
        <div><div class="card-title">Profile Completeness</div><p class="card-content">${esc(p.profile_completeness)}</p></div>
        <div><div class="card-title">Content Themes</div><p class="card-content">${esc(p.content_themes)}</p></div>
        <div><div class="card-title">Tone Consistency</div><p class="card-content">${esc(p.tone_consistency)}</p></div>
        <div><div class="card-title">Visual Consistency</div><p class="card-content">${esc(p.visual_consistency)}</p></div>
        <div><div class="card-title">Engagement Quality</div><p class="card-content">${esc(p.engagement_quality)}</p></div>
        <div><div class="card-title">Posting Frequency</div><p class="card-content">${esc(p.posting_frequency)}</p></div>
      </div>
    </div>
  `).join('');

  const priorityHtml = (content.priority_action_plan || []).sort((a,b) => a.rank - b.rank).map(a => `
    <div class="card" style="display:flex; gap:16pt; margin-bottom:15pt; break-inside:avoid;">
      <div style="width:32pt; height:32pt; background:#111; color:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:14pt; flex-shrink:0; font-family:'Inter',sans-serif;">${esc(a.rank)}</div>
      <div style="flex:1;">
        <h3 style="font-size:12pt; font-weight:800; margin-bottom:6pt; font-family:'Inter',sans-serif;">${esc(a.action)}</h3>
        <p class="card-content" style="margin-bottom:10pt;">${esc(a.why)}</p>
        <div style="margin-bottom:10pt;">
          <span class="badge">Effort: ${esc(a.effort)}</span>
          <span class="badge">Impact: ${esc(a.impact)}</span>
        </div>
        <div style="background:#fffbeb; border:1px solid #fcd34d; padding:10pt; border-radius:6pt;">
          <div style="font-size:9pt; font-weight:700; color:#b45309; text-transform:uppercase; margin-bottom:4pt; font-family:'Inter',sans-serif;">First Step Tomorrow →</div>
          <div style="font-size:10pt; color:#92400e; font-weight:500;">${esc(a.first_step)}</div>
        </div>
      </div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Georgia&display=swap" rel="stylesheet">
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Georgia', serif; color: #111827; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; line-height: 1.6; }
h1, h2, h3, h4, .sans { font-family: 'Inter', sans-serif; }
@page { size: A4; margin: 70pt 0 60pt 0; }
@page :first { margin: 0; }
.card, .metric, .banner, .avoid-break { page-break-inside: avoid; break-inside: avoid; }
.cover { width: 100%; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; page-break-after: always; background-color: #c71212; ${coverDataUri ? `background-image: url('${coverDataUri}');` : ''} background-size: cover; background-position: center; background-repeat: no-repeat; padding: 40pt; }
.cover-subtitle { font-size: 14pt; font-weight: 700; color: rgba(255,255,255,0.75); text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 20pt; font-family: 'Inter', sans-serif; }
.cover-name { font-size: 46pt; font-weight: 800; color: #ffffff; line-height: 1.1; letter-spacing: -0.02em; margin-bottom: 40pt; font-family: 'Inter', sans-serif; }
.cover-meta { display: flex; flex-direction: column; align-items: center; gap: 14pt; margin-top: 20pt; }
.cover-url { font-size: 13pt; font-weight: 600; color: #c71212; background: #ffffff; padding: 8pt 24pt; border-radius: 30pt; font-family: monospace; }
.cover-date { font-size: 11pt; font-weight: 500; color: rgba(255,255,255,0.7); margin-top: 8pt; text-transform: uppercase; letter-spacing: 0.05em; font-family: 'Inter', sans-serif; }
.content-wrapper { padding: 0 60pt; }
.section-block { page-break-before: always; padding-top: 10pt; }
.section-block:first-child { page-break-before: avoid; }
.banner { background: #c71212; border-radius: 12pt; padding: 24pt 30pt; display: flex; justify-content: space-between; align-items: center; margin-bottom: 30pt; font-family: 'Inter', sans-serif; }
.banner-left h2 { color: #fff; font-size: 19pt; font-weight: 800; margin-bottom: 4pt; }
.banner-left .b-score-label { color: rgba(255,255,255,0.8); font-size: 10.5pt; font-weight: 600; }
.banner-left .b-url { color: rgba(255,255,255,0.8); font-size: 10.5pt; margin-top: 6pt; font-family: monospace; background: rgba(0,0,0,0.1); padding: 2pt 6pt; border-radius: 4pt; display: inline-block; }
.score-ring { width: 72pt; height: 72pt; border-radius: 50%; background: conic-gradient(#fff 0deg, #fff ${ringDeg}deg, rgba(255,255,255,0.2) ${ringDeg}deg, rgba(255,255,255,0.2) 360deg); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.score-inner { width: 58pt; height: 58pt; background: #c71212; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.score-num { color: #fff; font-size: 22pt; font-weight: 800; line-height: 1; }
.score-den { color: rgba(255,255,255,0.6); font-size: 8.5pt; font-weight: 600; }
.sec-title { font-family: 'Inter', sans-serif; font-size: 14pt; font-weight: 800; color: #111; display: flex; align-items: center; gap: 12pt; margin-bottom: 20pt; padding-bottom: 6pt; text-transform: uppercase; letter-spacing: 0.05em; break-after: avoid; }
.sec-title::after { content: ''; flex: 1; height: 1.5pt; background: #c71212; opacity: 0.2; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12pt; margin-bottom: 20pt; }
.card { background: #fff; border: 1px solid #e5e7eb; padding: 16pt; border-radius: 8pt; }
.card-warning { background: #fffbeb; border-color: #fcd34d; }
.card-title { font-size: 10pt; font-weight: 700; text-transform: uppercase; color: #6b7280; margin-bottom: 6pt; font-family: 'Inter', sans-serif; }
.text-warning { color: #b45309; }
.card-content { font-size: 10.5pt; color: #374151; white-space: pre-line; }
.badge { background: #f3f4f6; color: #374151; padding: 3pt 8pt; border-radius: 12pt; font-size: 8pt; font-weight: 700; text-transform: uppercase; display: inline-block; font-family: 'Inter', sans-serif; }
.metric { display: flex; justify-content: space-between; padding: 8pt 0; border-bottom: 1px solid #f3f4f6; font-size: 10.5pt; font-family: 'Inter', sans-serif; }
.m-label { color: #6b7280; font-weight: 600; }
.m-val { font-weight: 800; }
.blist { padding-left: 16pt; font-size: 10pt; color: #4b5563; line-height: 1.6; font-family:'Inter', sans-serif; }
.blist li { margin-bottom: 4pt; }
</style>
</head>
<body>

<div class="cover">
  <div class="cover-subtitle">Brand Audit Report</div>
  <div class="cover-name">${esc(lead.company_name || lead.name)}</div>
  <div class="cover-meta">
    <div class="cover-url">${esc(lead.identifier)}</div>
    <div class="cover-date">${esc(dateStr)}</div>
  </div>
</div>

<div class="content-wrapper">
  
  <div class="section-block">
    <div class="banner">
      <div class="banner-left">
        <h2>Brand Audit Report</h2>
        <div class="b-score-label">Overall Brand Score: <span style="color:#fff;">${score}/100</span></div>
        <div class="b-url">${esc(lead.identifier)}</div>
      </div>
      <div class="score-ring">
        <div class="score-inner">
          <span class="score-num">${score}</span>
          <span class="score-den">/100</span>
        </div>
      </div>
    </div>

    <!-- Executive Summary & Scores -->
    <div class="sec-title">1. Executive Summary</div>
    <p class="card-content" style="margin-bottom:24pt;">${esc(content.executive_summary)}</p>
    
    <div class="sec-title">Audit Scores</div>
    <div class="grid-2">
      <div class="card">
        ${metricRow('Visual Consistency', `${content.scores?.visual_consistency ?? 0}/100`, content.scores?.visual_consistency)}
        ${metricRow('Messaging Clarity', `${content.scores?.messaging_clarity ?? 0}/100`, content.scores?.messaging_clarity)}
        ${metricRow('Audience Alignment', `${content.scores?.audience_alignment ?? 0}/100`, content.scores?.audience_alignment)}
      </div>
      <div class="card">
        ${metricRow('Brand Foundation', `${content.scores?.brand_foundation ?? 0}/100`, content.scores?.brand_foundation)}
        ${metricRow('Digital Presence', `${content.scores?.digital_presence ?? 0}/100`, content.scores?.digital_presence)}
      </div>
    </div>
  </div>

  <div class="section-block">
    <div class="sec-title">2. Brand Foundation</div>
    ${simpleGrid([
      { title: 'Purpose Statement', content: content.brand_foundation?.purpose_statement },
      { title: 'Mission, Vision, Values', content: content.brand_foundation?.mission_vision_values },
      { title: 'Positioning', content: content.brand_foundation?.positioning },
      { title: 'Target Audience', content: content.brand_foundation?.target_audience },
      { title: 'Personality & Tone', content: content.brand_foundation?.personality_tone },
      { title: 'Social Media Signals', content: content.brand_foundation?.social_media_signals },
      { title: 'What Is Missing', content: content.brand_foundation?.what_is_missing }
    ], true)}
  </div>

  <div class="section-block">
    <div class="sec-title">3. Competitor Analysis</div>
    ${compHtml}
  </div>

  <div class="section-block">
    <div class="sec-title">4. Visual Identity Audit</div>
    ${simpleGrid([
      { title: 'Logo Usage', content: content.visual_identity?.logo_usage },
      { title: 'Logo Impression', content: content.visual_identity?.logo_impression },
      { title: 'Colour Palette', content: content.visual_identity?.colour_palette },
      { title: 'Typography', content: content.visual_identity?.typography },
      { title: 'Imagery Style', content: content.visual_identity?.imagery_style },
      { title: 'Overall Brand System', content: content.visual_identity?.overall_brand_system }
    ])}
  </div>

  <div class="section-block">
    <div class="sec-title">5. Website Audit</div>
    ${simpleGrid([
      { title: 'First Impression', content: content.website_audit?.first_impression },
      { title: 'Messaging Clarity', content: content.website_audit?.messaging_clarity },
      { title: 'Tone Consistency', content: content.website_audit?.tone_consistency },
      { title: 'Visual Consistency', content: content.website_audit?.visual_consistency },
      { title: 'User Experience', content: content.website_audit?.user_experience },
      { title: 'SEO & Discoverability', content: content.website_audit?.seo_discoverability },
      { title: 'CTAs & Conversion', content: content.website_audit?.ctas_conversion }
    ])}
  </div>

  <div class="section-block">
    <div class="sec-title">6. Social Media Audit</div>
    ${socialHtml}
    ${content.social_media_audit?.cross_platform_summary ? `
      <div class="card avoid-break">
        <h4 class="card-title">Cross-Platform Summary</h4>
        <p class="card-content">${esc(content.social_media_audit.cross_platform_summary)}</p>
      </div>
    ` : ''}
  </div>

  <div class="section-block">
    <div class="sec-title">7. Content Audit</div>
    ${simpleGrid([
      { title: 'Content Overview', content: content.content_audit?.content_overview },
      { title: 'Content Strengths', content: content.content_audit?.content_strengths },
      { title: 'Content Gaps', content: content.content_audit?.content_gaps },
      { title: 'Content Recommendations', content: content.content_audit?.content_recommendations }
    ])}
  </div>

  <div class="section-block">
    <div class="sec-title">8. Verbal Identity Audit</div>
    ${simpleGrid([
      { title: 'Website Message', content: content.verbal_identity?.website_message },
      { title: 'Social Voice', content: content.verbal_identity?.social_voice },
      { title: 'Naming Consistency', content: content.verbal_identity?.naming_consistency },
      { title: 'Employee Story', content: content.verbal_identity?.employee_story },
      { title: 'Overall Assessment', content: content.verbal_identity?.overall_assessment }
    ])}
  </div>

  <div class="section-block">
    <div class="sec-title">9. Audience Perception</div>
    ${simpleGrid([
      { title: 'What Customers Say', content: content.audience_perception?.what_customers_say },
      { title: 'Perceived Strengths', content: content.audience_perception?.perceived_strengths },
      { title: 'Compared With Competitors', content: content.audience_perception?.compared_with_competitors },
      { title: 'Overall Read', content: content.audience_perception?.overall_read }
    ])}
  </div>

  <div class="section-block">
    <div class="sec-title">10. Key Findings Summary</div>
    <div class="card avoid-break" style="margin-bottom:20pt;">
      <div style="display:flex; gap:16pt; margin-bottom:20pt;">
        <div style="flex:1;">
          <h4 style="color:#16a34a; font-family:'Inter',sans-serif; font-size:11pt; margin-bottom:8pt;">✓ Strengths</h4>
          <ul class="blist">${(content.key_findings?.strengths || []).map(s => `<li>${esc(s)}</li>`).join('')}</ul>
        </div>
        <div style="flex:1;">
          <h4 style="color:#d97706; font-family:'Inter',sans-serif; font-size:11pt; margin-bottom:8pt;">! Inconsistencies</h4>
          <ul class="blist">${(content.key_findings?.inconsistencies || []).map(s => `<li>${esc(s)}</li>`).join('')}</ul>
        </div>
        <div style="flex:1;">
          <h4 style="color:#dc2626; font-family:'Inter',sans-serif; font-size:11pt; margin-bottom:8pt;">✕ Gaps</h4>
          <ul class="blist">${(content.key_findings?.gaps || []).map(s => `<li>${esc(s)}</li>`).join('')}</ul>
        </div>
      </div>
      <div style="border-top:1px solid #e5e7eb; padding-top:16pt;">
        <p class="card-content" style="margin-bottom:10pt;"><strong>Brand Foundation:</strong> ${esc(content.key_findings?.brand_foundation_summary)}</p>
        <p class="card-content" style="margin-bottom:10pt;"><strong>Audience & Tone:</strong> ${esc(content.key_findings?.audience_tone_summary)}</p>
        <p class="card-content"><strong>Competitive Read:</strong> ${esc(content.key_findings?.competitive_read)}</p>
      </div>
    </div>
  </div>

  <div class="section-block">
    <div class="sec-title">11. Growth Opportunities</div>
    <div class="card" style="padding:0; overflow:hidden;">
      <table style="width:100%; border-collapse:collapse; font-family:'Inter',sans-serif;">
        <thead style="background:#f9fafb; border-bottom:1px solid #e5e7eb;">
          <tr>
            <th style="padding:12pt; text-align:left; font-size:10pt; color:#6b7280; text-transform:uppercase;">Opportunity</th>
            <th style="padding:12pt; text-align:left; font-size:10pt; color:#6b7280; text-transform:uppercase;">Effort</th>
            <th style="padding:12pt; text-align:left; font-size:10pt; color:#6b7280; text-transform:uppercase;">Impact</th>
            <th style="padding:12pt; text-align:left; font-size:10pt; color:#6b7280; text-transform:uppercase;">Timeframe</th>
          </tr>
        </thead>
        <tbody>
          ${(content.growth_opportunities || []).map(g => `
            <tr style="border-bottom:1px solid #e5e7eb;">
              <td style="padding:12pt;">
                <div style="font-weight:700; color:#111; font-size:11pt; margin-bottom:4pt;">${esc(g.opportunity)}</div>
                <div style="font-size:9.5pt; color:#6b7280; font-style:italic;">${esc(g.why_now)}</div>
              </td>
              <td style="padding:12pt;"><span class="badge" style="background:${g.effort?.toLowerCase() === 'low' ? '#dcfce7' : '#fee2e2'}; color:${g.effort?.toLowerCase() === 'low' ? '#16a34a' : '#dc2626'};">${esc(g.effort)}</span></td>
              <td style="padding:12pt;"><span class="badge" style="background:${g.impact?.toLowerCase() === 'high' ? '#dcfce7' : '#dbeafe'}; color:${g.impact?.toLowerCase() === 'high' ? '#16a34a' : '#2563eb'};">${esc(g.impact)}</span></td>
              <td style="padding:12pt; font-size:10pt;">${esc(g.timeframe)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <div class="section-block">
    <div class="sec-title">12. Priority Action Plan</div>
    ${priorityHtml}
  </div>

  <!-- ── PITCH PAGE ── -->
  <div class="section-block">
    <div style="background:#111111; border-radius:14pt; padding:40pt 36pt; color:#fff; text-align:center; break-inside:avoid; font-family:'Inter',sans-serif;">
      <div style="display:inline-block; background:rgba(199,18,18,0.15); border:1px solid rgba(199,18,18,0.3); color:#ff6b6b; font-size:8pt; font-weight:800; text-transform:uppercase; letter-spacing:0.18em; padding:5pt 14pt; border-radius:20pt; margin-bottom:18pt;">
        What happens next?
      </div>
      <h2 style="font-size:22pt; font-weight:800; line-height:1.25; margin-bottom:10pt; color:#ffffff;">
        Ready to elevate your brand in 30 days?
      </h2>
      <p style="font-size:10pt; color:rgba(255,255,255,0.55); margin-bottom:28pt; max-width:360pt; margin-left:auto; margin-right:auto; line-height:1.7;">
        We turn audit reports like this into real, measurable results — stronger positioning, better visual identity, and more paying customers.
      </p>

      <div style="display:flex; gap:12pt; margin-bottom:30pt; text-align:left;">
        <div style="flex:1; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); border-radius:10pt; padding:16pt;">
          <div style="font-size:20pt; margin-bottom:10pt;">✨</div>
          <div style="font-weight:800; font-size:10pt; color:#fff; margin-bottom:6pt;">Visual Identity</div>
          <div style="font-size:8.5pt; color:rgba(255,255,255,0.45); line-height:1.6;">Reimagining your brand aesthetics for maximum premium feel and trust.</div>
        </div>
        <div style="flex:1; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); border-radius:10pt; padding:16pt;">
          <div style="font-size:20pt; margin-bottom:10pt;">📝</div>
          <div style="font-weight:800; font-size:10pt; color:#fff; margin-bottom:6pt;">Messaging &amp; Copy</div>
          <div style="font-size:8.5pt; color:rgba(255,255,255,0.45); line-height:1.6;">Writing copy that instantly captures attention and converts visitors.</div>
        </div>
        <div style="flex:1; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); border-radius:10pt; padding:16pt;">
          <div style="font-size:20pt; margin-bottom:10pt;">🚀</div>
          <div style="font-weight:800; font-size:10pt; color:#fff; margin-bottom:6pt;">Market Dominance</div>
          <div style="font-size:8.5pt; color:rgba(255,255,255,0.45); line-height:1.6;">Strategic positioning that makes your actual competitors irrelevant.</div>
        </div>
      </div>

      <!-- CTA block -->
      <div style="background:#c71212; border-radius:12pt; padding:20pt 28pt; display:inline-block; min-width:280pt;">
        <div style="font-weight:800; font-size:13pt; color:#fff; margin-bottom:5pt;">Book a Free Strategy Call</div>
        <div style="font-size:9.5pt; color:rgba(255,255,255,0.75);">No pitch. No commitment. Just a clear plan.</div>
        <div style="margin-top:12pt; font-size:10pt; font-weight:700; color:#fff; letter-spacing:0.03em;">www.megamind.studio</div>
      </div>

      <div style="margin-top:22pt; font-size:8pt; color:rgba(255,255,255,0.2); letter-spacing:0.05em; text-transform:uppercase;">
        Megamind Advertising Private Limited · megamind.studio
      </div>
    </div>
  </div>

</div>
</body>
</html>`
}

export async function generatePdfBuffer(lead: Lead, reportContent: ReportContent): Promise<Buffer> {
  const html = buildReportHtml(lead, reportContent)

  const headerHtml = `
    <style>
      .header-container {
        width: 100%; padding: 0 60pt; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 9pt; color: #9ca3af; display: flex; justify-content: space-between; align-items: flex-end;
        margin-top: 25pt; -webkit-print-color-adjust: exact;
      }
      .header-border {
        width: 100%; border-bottom: 1.5px solid #f3f4f6; padding-bottom: 10pt;
        display: flex; justify-content: space-between; align-items: flex-end;
      }
      .brand { font-size: 10pt; font-weight: 800; color: #c71212; letter-spacing: 0.05em; text-transform: uppercase; }
      .page-num { font-weight: 600; }
    </style>
    <div class="header-container">
      <div class="header-border">
        <div class="brand">Megamind studios</div>
        <div class="page-num">0<span class="pageNumber"></span> / 0<span class="totalPages"></span></div>
      </div>
    </div>
  `

  const footerHtml = `
    <style>
      .footer-container {
        width: 100%; padding: 0 60pt; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 8.5pt; color: #9ca3af; display: flex; justify-content: space-between;
        margin-bottom: 20pt; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;
        -webkit-print-color-adjust: exact;
      }
      .footer-border {
        width: 100%; border-top: 1.5px solid #f3f4f6; padding-top: 12pt;
        display: flex; justify-content: space-between;
      }
    </style>
    <div class="footer-container">
      <div class="footer-border">
        <span>Megamind Advertising Private Limited</span>
        <span>CONFIDENTIAL</span>
      </div>
    </div>
  `

  let executablePath: string
  let args: string[] = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']

  if (process.platform === 'darwin') {
    const chromePaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    ]
    const found = chromePaths.find(p => existsSync(p))
    if (!found) throw new Error('No Chrome/Chromium found on macOS. Install Google Chrome.')
    executablePath = found
    console.log(`🖨️  Using Chrome at: ${executablePath}`)
  } else if (process.platform === 'win32') {
    const chromePaths = [
      'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
      'C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Google\\\\Chrome\\\\Application\\\\chrome.exe'),
      'C:\\\\Program Files\\\\Google\\\\Chrome Canary\\\\Application\\\\chrome.exe',
    ]
    const found = chromePaths.find(p => existsSync(p))
    if (!found) throw new Error('No Chrome/Chromium found on Windows. Please install Google Chrome.')
    executablePath = found
    console.log(`🖨️  Using Chrome at: ${executablePath}`)
  } else {
    console.log('📦 Loading @sparticuz/chromium...')
    try {
      executablePath = await chromium.executablePath()
      args = chromium.args
      console.log('✅ Chromium executable path:', executablePath)
    } catch (err) {
      console.error('❌ Failed to get Chromium executable path:', err)
      throw err
    }
  }

  const browser = await puppeteer.launch({ args, executablePath, headless: true })
  try {
    const page = await browser.newPage()

    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 })

    const pdfBuffer = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true, 
      displayHeaderFooter: true,
      headerTemplate: headerHtml,
      footerTemplate: footerHtml,
    })

    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}