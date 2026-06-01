'use client';

import { useState } from 'react';
import { ReportContent } from '@/lib/types/database';

interface ReportViewerProps {
  lead?: any;
  reportContent?: ReportContent;
  rawData?: any;
}

export default function ReportViewer({ lead, reportContent: r, rawData }: ReportViewerProps) {
  const [showRawData, setShowRawData] = useState(false);
  const [compTab, setCompTab] = useState<'regional' | 'national' | 'international'>('regional');

  if (!r) {
    return (
      <div className="admin-empty">
        <div className="admin-empty-icon">⏳</div>
        <div className="admin-empty-title">Report not ready</div>
        <p style={{ fontSize: '0.8125rem' }}>The AI analysis is still processing. Check back shortly.</p>
      </div>
    );
  }

  // Helper for rendering badges
  const Badge = ({ text, color }: { text: string; color?: string }) => {
    let bg = '#f3f4f6';
    let textCol = '#374151';
    
    if (color === 'red') { bg = '#fee2e2'; textCol = '#dc2626'; }
    if (color === 'amber') { bg = '#fef3c7'; textCol = '#d97706'; }
    if (color === 'green') { bg = '#dcfce7'; textCol = '#16a34a'; }
    if (color === 'blue') { bg = '#dbeafe'; textCol = '#2563eb'; }

    return (
      <span style={{ 
        background: bg, color: textCol, 
        padding: '2px 8px', borderRadius: '12px', 
        fontSize: '0.6875rem', fontWeight: 600, 
        textTransform: 'uppercase', letterSpacing: '0.05em',
        display: 'inline-block'
      }}>
        {text}
      </span>
    );
  };

  // Helper for rendering score bars
  const ScoreBar = ({ label, value }: { label: string; value: number }) => {
    const col = value >= 70 ? '#16a34a' : value >= 45 ? '#d97706' : '#dc2626';
    return (
      <div style={{ marginBottom: '12px', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px', fontWeight: 600 }}>
          <span>{label}</span>
          <span style={{ color: col }}>{value}/100</span>
        </div>
        <div style={{ height: '6px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${value}%`, background: col, borderRadius: '4px' }} />
        </div>
      </div>
    );
  };

  // The main container style
  const containerStyle = {
    background: '#F7F7F5',
    padding: '32px',
    borderRadius: '12px',
    color: '#111827',
    fontFamily: 'Georgia, serif' // Serifs for body
  };

  const cardStyle = {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
  };

  const sansFont = { fontFamily: 'Inter, system-ui, sans-serif' };

  return (
    <div style={containerStyle}>
      
      {/* HEADER CARD */}
      <div style={{ ...cardStyle, borderTop: '4px solid #111827' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <Badge text="Brand Audit Report — Internal Review" color="red" />
            <h1 style={{ ...sansFont, fontSize: '32px', fontWeight: 800, marginTop: '16px', marginBottom: '8px', letterSpacing: '-0.02em' }}>
              {lead?.brand_name || lead?.company_name || 'Brand Audit'}
            </h1>
            <p style={{ ...sansFont, fontSize: '14px', color: '#6b7280' }}>
              Submitted: {lead?.created_at ? new Date(lead.created_at).toLocaleDateString() : 'N/A'} • Industry: {lead?.industry || 'Unknown'}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ ...sansFont, fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Overall Score</div>
            <div style={{ ...sansFont, fontSize: '48px', fontWeight: 900, lineHeight: 1, color: r.scores?.overall >= 70 ? '#16a34a' : r.scores?.overall >= 45 ? '#d97706' : '#dc2626' }}>
              {r.scores?.overall || 0}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
          <div>
            <ScoreBar label="Visual Consistency" value={r.scores?.visual_consistency || 0} />
            <ScoreBar label="Messaging Clarity" value={r.scores?.messaging_clarity || 0} />
            <ScoreBar label="Audience Alignment" value={r.scores?.audience_alignment || 0} />
          </div>
          <div>
            <ScoreBar label="Brand Foundation" value={r.scores?.brand_foundation || 0} />
            <ScoreBar label="Digital Presence" value={r.scores?.digital_presence || 0} />
          </div>
        </div>
      </div>

      {/* SECTION 1 - EXECUTIVE SUMMARY */}
      <h2 style={{ ...sansFont, fontSize: '18px', fontWeight: 700, margin: '32px 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        1. Executive Summary
      </h2>
      <div style={{ ...cardStyle, fontSize: '16px', lineHeight: 1.8, color: '#374151', whiteSpace: 'pre-line' }}>
        {r.executive_summary}
      </div>

      {/* SECTION 2 - BRAND FOUNDATION REVIEW */}
      <h2 style={{ ...sansFont, fontSize: '18px', fontWeight: 700, margin: '32px 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        2. Brand Foundation Review
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {[
          { title: 'Purpose Statement', content: r.brand_foundation?.purpose_statement },
          { title: 'Mission, Vision, Values', content: r.brand_foundation?.mission_vision_values },
          { title: 'Positioning', content: r.brand_foundation?.positioning },
          { title: 'Target Audience', content: r.brand_foundation?.target_audience },
          { title: 'Personality & Tone', content: r.brand_foundation?.personality_tone },
          { title: 'Social Media Signals', content: r.brand_foundation?.social_media_signals },
        ].map((item, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ ...sansFont, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', marginBottom: '8px' }}>{item.title}</h3>
            <p style={{ fontSize: '15px', lineHeight: 1.6, margin: 0 }}>{item.content || '—'}</p>
          </div>
        ))}
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', padding: '20px', borderRadius: '8px', gridColumn: '1 / -1' }}>
          <h3 style={{ ...sansFont, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#b45309', marginBottom: '8px' }}>What Is Missing</h3>
          <p style={{ fontSize: '15px', lineHeight: 1.6, margin: 0, color: '#92400e' }}>{r.brand_foundation?.what_is_missing || '—'}</p>
        </div>
      </div>

      {/* SECTION 3 - COMPETITOR ANALYSIS */}
      <h2 style={{ ...sansFont, fontSize: '18px', fontWeight: 700, margin: '32px 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        3. Competitor Analysis
      </h2>
      <div style={cardStyle}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', ...sansFont }}>
          {(['regional', 'national', 'international'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setCompTab(tab)}
              style={{
                padding: '8px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', border: 'none',
                background: compTab === tab ? '#111827' : '#f3f4f6',
                color: compTab === tab ? '#fff' : '#4b5563'
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        
        {r.competitors && r.competitors[compTab] && (() => {
          const c = r.competitors[compTab];
          return (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <span style={{ ...sansFont, fontSize: '12px', fontWeight: 700, color: '#6b7280', marginRight: '12px', textTransform: 'uppercase' }}>Competitors:</span>
                {c.competitor_names?.map((n, i) => <span key={i} style={{ marginRight: '8px' }}><Badge text={n} /></span>)}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                <div>
                  <h4 style={{ ...sansFont, fontSize: '14px', fontWeight: 700, color: '#16a34a', marginBottom: '12px' }}>✓ How Brand Matches</h4>
                  <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '15px', lineHeight: 1.6 }}>
                    {c.how_brand_matches?.map((m, i) => <li key={i} style={{ marginBottom: '8px' }}>{m}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 style={{ ...sansFont, fontSize: '14px', fontWeight: 700, color: '#dc2626', marginBottom: '12px' }}>✕ Where Brand Lags</h4>
                  <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '15px', lineHeight: 1.6 }}>
                    {c.where_brand_lags?.map((m, i) => <li key={i} style={{ marginBottom: '8px' }}>{m}</li>)}
                  </ul>
                </div>
              </div>

              <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '6px', marginBottom: '24px', borderLeft: '4px solid #9ca3af' }}>
                <h4 style={{ ...sansFont, fontSize: '12px', fontWeight: 700, color: '#4b5563', marginBottom: '8px', textTransform: 'uppercase' }}>Competitive Implications</h4>
                <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.6 }}>{c.competitive_implications}</p>
              </div>

              <div style={{ background: '#eff6ff', padding: '20px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                <h4 style={{ ...sansFont, fontSize: '14px', fontWeight: 700, color: '#1d4ed8', marginBottom: '12px' }}>Recommended Priorities</h4>
                <ol style={{ paddingLeft: '20px', margin: 0, fontSize: '15px', lineHeight: 1.6, color: '#1e3a8a' }}>
                  {c.recommended_priorities?.map((p, i) => <li key={i} style={{ marginBottom: '8px' }}>{p}</li>)}
                </ol>
              </div>
            </div>
          );
        })()}
      </div>

      {/* SECTION 4 - VISUAL IDENTITY AUDIT */}
      <h2 style={{ ...sansFont, fontSize: '18px', fontWeight: 700, margin: '32px 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        4. Visual Identity Audit
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {[
          { title: 'Logo Usage', content: r.visual_identity?.logo_usage },
          { title: 'Logo Impression', content: r.visual_identity?.logo_impression },
          { title: 'Colour Palette', content: r.visual_identity?.colour_palette },
          { title: 'Typography', content: r.visual_identity?.typography },
          { title: 'Imagery Style', content: r.visual_identity?.imagery_style },
          { title: 'Overall Brand System', content: r.visual_identity?.overall_brand_system },
        ].map((item, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ ...sansFont, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', marginBottom: '8px' }}>{item.title}</h3>
            <p style={{ fontSize: '15px', lineHeight: 1.6, margin: 0 }}>{item.content || '—'}</p>
          </div>
        ))}
      </div>

      {/* SECTION 5 - WEBSITE AUDIT */}
      <h2 style={{ ...sansFont, fontSize: '18px', fontWeight: 700, margin: '32px 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        5. Website Audit
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {[
          { title: 'First Impression', content: r.website_audit?.first_impression },
          { title: 'Messaging Clarity', content: r.website_audit?.messaging_clarity },
          { title: 'Tone Consistency', content: r.website_audit?.tone_consistency },
          { title: 'Visual Consistency', content: r.website_audit?.visual_consistency },
          { title: 'User Experience', content: r.website_audit?.user_experience },
          { title: 'SEO & Discoverability', content: r.website_audit?.seo_discoverability },
          { title: 'CTAs & Conversion', content: r.website_audit?.ctas_conversion },
        ].map((item, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', padding: '20px', borderRadius: '8px', gridColumn: i === 6 ? '1 / -1' : 'auto' }}>
            <h3 style={{ ...sansFont, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', marginBottom: '8px' }}>{item.title}</h3>
            <p style={{ fontSize: '15px', lineHeight: 1.6, margin: 0 }}>{item.content || '—'}</p>
          </div>
        ))}
      </div>

      {/* SECTION 6 - SOCIAL MEDIA AUDIT */}
      <h2 style={{ ...sansFont, fontSize: '18px', fontWeight: 700, margin: '32px 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        6. Social Media Audit
      </h2>
      {r.social_media_audit?.platforms?.map((p, i) => (
        <div key={i} style={cardStyle}>
          <h3 style={{ ...sansFont, fontSize: '16px', fontWeight: 800, marginBottom: '16px', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
            Platform: {p.platform}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <div style={{ ...sansFont, fontSize: '12px', fontWeight: 700, color: '#6b7280' }}>Profile Completeness</div>
              <p style={{ fontSize: '14px', marginTop: '4px' }}>{p.profile_completeness}</p>
            </div>
            <div>
              <div style={{ ...sansFont, fontSize: '12px', fontWeight: 700, color: '#6b7280' }}>Content Themes</div>
              <p style={{ fontSize: '14px', marginTop: '4px' }}>{p.content_themes}</p>
            </div>
            <div>
              <div style={{ ...sansFont, fontSize: '12px', fontWeight: 700, color: '#6b7280' }}>Tone Consistency</div>
              <p style={{ fontSize: '14px', marginTop: '4px' }}>{p.tone_consistency}</p>
            </div>
            <div>
              <div style={{ ...sansFont, fontSize: '12px', fontWeight: 700, color: '#6b7280' }}>Visual Consistency</div>
              <p style={{ fontSize: '14px', marginTop: '4px' }}>{p.visual_consistency}</p>
            </div>
            <div>
              <div style={{ ...sansFont, fontSize: '12px', fontWeight: 700, color: '#6b7280' }}>Engagement Quality</div>
              <p style={{ fontSize: '14px', marginTop: '4px' }}>{p.engagement_quality}</p>
            </div>
            <div>
              <div style={{ ...sansFont, fontSize: '12px', fontWeight: 700, color: '#6b7280' }}>Posting Frequency</div>
              <p style={{ fontSize: '14px', marginTop: '4px' }}>{p.posting_frequency}</p>
            </div>
          </div>
        </div>
      ))}
      {r.social_media_audit?.cross_platform_summary && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', padding: '24px', borderRadius: '8px', marginBottom: '24px' }}>
          <h3 style={{ ...sansFont, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>Cross-Platform Summary</h3>
          <p style={{ fontSize: '16px', lineHeight: 1.6, margin: 0 }}>{r.social_media_audit.cross_platform_summary}</p>
        </div>
      )}

      {/* SECTION 7 - CONTENT AUDIT */}
      <h2 style={{ ...sansFont, fontSize: '18px', fontWeight: 700, margin: '32px 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        7. Content Audit
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {[
          { title: 'Content Overview', content: r.content_audit?.content_overview },
          { title: 'Content Strengths', content: r.content_audit?.content_strengths },
          { title: 'Content Gaps', content: r.content_audit?.content_gaps },
          { title: 'Content Recommendations', content: r.content_audit?.content_recommendations },
        ].map((item, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ ...sansFont, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', marginBottom: '8px' }}>{item.title}</h3>
            <p style={{ fontSize: '15px', lineHeight: 1.6, margin: 0 }}>{item.content || '—'}</p>
          </div>
        ))}
      </div>

      {/* SECTION 8 - VERBAL IDENTITY AUDIT */}
      <h2 style={{ ...sansFont, fontSize: '18px', fontWeight: 700, margin: '32px 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        8. Verbal Identity Audit
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {[
          { title: 'Website Message', content: r.verbal_identity?.website_message },
          { title: 'Social Voice', content: r.verbal_identity?.social_voice },
          { title: 'Naming Consistency', content: r.verbal_identity?.naming_consistency },
          { title: 'Employee Story', content: r.verbal_identity?.employee_story },
          { title: 'Overall Assessment', content: r.verbal_identity?.overall_assessment },
        ].map((item, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', padding: '20px', borderRadius: '8px', gridColumn: i === 4 ? '1 / -1' : 'auto' }}>
            <h3 style={{ ...sansFont, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', marginBottom: '8px' }}>{item.title}</h3>
            <p style={{ fontSize: '15px', lineHeight: 1.6, margin: 0 }}>{item.content || '—'}</p>
          </div>
        ))}
      </div>

      {/* SECTION 9 - AUDIENCE PERCEPTION */}
      <h2 style={{ ...sansFont, fontSize: '18px', fontWeight: 700, margin: '32px 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        9. Audience Perception
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {[
          { title: 'What Customers Say', content: r.audience_perception?.what_customers_say },
          { title: 'Perceived Strengths', content: r.audience_perception?.perceived_strengths },
          { title: 'Compared With Competitors', content: r.audience_perception?.compared_with_competitors },
          { title: 'Overall Read', content: r.audience_perception?.overall_read },
        ].map((item, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ ...sansFont, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', marginBottom: '8px' }}>{item.title}</h3>
            <p style={{ fontSize: '15px', lineHeight: 1.6, margin: 0 }}>{item.content || '—'}</p>
          </div>
        ))}
      </div>

      {/* SECTION 10 - KEY FINDINGS SUMMARY */}
      <h2 style={{ ...sansFont, fontSize: '18px', fontWeight: 700, margin: '32px 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        10. Key Findings Summary
      </h2>
      <div style={cardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '32px' }}>
          <div>
            <h4 style={{ ...sansFont, fontSize: '14px', fontWeight: 700, color: '#16a34a', marginBottom: '12px' }}>✓ Strengths</h4>
            <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '14px', lineHeight: 1.6 }}>
              {r.key_findings?.strengths?.map((s, i) => <li key={i} style={{ marginBottom: '8px' }}>{s}</li>)}
            </ul>
          </div>
          <div>
            <h4 style={{ ...sansFont, fontSize: '14px', fontWeight: 700, color: '#d97706', marginBottom: '12px' }}>! Inconsistencies</h4>
            <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '14px', lineHeight: 1.6 }}>
              {r.key_findings?.inconsistencies?.map((s, i) => <li key={i} style={{ marginBottom: '8px' }}>{s}</li>)}
            </ul>
          </div>
          <div>
            <h4 style={{ ...sansFont, fontSize: '14px', fontWeight: 700, color: '#dc2626', marginBottom: '12px' }}>✕ Gaps</h4>
            <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '14px', lineHeight: 1.6 }}>
              {r.key_findings?.gaps?.map((s, i) => <li key={i} style={{ marginBottom: '8px' }}>{s}</li>)}
            </ul>
          </div>
        </div>
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '24px' }}>
          <p style={{ fontSize: '15px', lineHeight: 1.6, marginBottom: '16px' }}><strong>Brand Foundation:</strong> {r.key_findings?.brand_foundation_summary}</p>
          <p style={{ fontSize: '15px', lineHeight: 1.6, marginBottom: '16px' }}><strong>Audience & Tone:</strong> {r.key_findings?.audience_tone_summary}</p>
          <p style={{ fontSize: '15px', lineHeight: 1.6, margin: 0 }}><strong>Competitive Read:</strong> {r.key_findings?.competitive_read}</p>
        </div>
      </div>

      {/* SECTION 11 - DETAILED SCORES */}
      <h2 style={{ ...sansFont, fontSize: '18px', fontWeight: 700, margin: '32px 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        11. Audit Scores
      </h2>
      <div style={cardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          <div>
            <ScoreBar label="Visual Consistency" value={r.scores?.visual_consistency || 0} />
            <ScoreBar label="Messaging Clarity" value={r.scores?.messaging_clarity || 0} />
            <ScoreBar label="Audience Alignment" value={r.scores?.audience_alignment || 0} />
          </div>
          <div>
            <ScoreBar label="Brand Foundation" value={r.scores?.brand_foundation || 0} />
            <ScoreBar label="Digital Presence" value={r.scores?.digital_presence || 0} />
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '2px solid #e5e7eb' }}>
              <ScoreBar label="Overall Score" value={r.scores?.overall || 0} />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 12 - GROWTH OPPORTUNITIES */}
      <h2 style={{ ...sansFont, fontSize: '18px', fontWeight: 700, margin: '32px 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        12. Growth Opportunities
      </h2>
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', ...sansFont }}>
          <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Opportunity</th>
              <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Effort</th>
              <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Impact</th>
              <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Timeframe</th>
            </tr>
          </thead>
          <tbody>
            {r.growth_opportunities?.map((g, i) => (
              <tr key={i} style={{ borderBottom: i < r.growth_opportunities.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                <td style={{ padding: '16px' }}>
                  <div style={{ fontWeight: 600, color: '#111827', fontSize: '14px', marginBottom: '4px' }}>{g.opportunity}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>{g.why_now}</div>
                </td>
                <td style={{ padding: '16px' }}>
                  <Badge text={g.effort} color={g.effort?.toLowerCase() === 'low' ? 'green' : g.effort?.toLowerCase() === 'high' ? 'red' : 'amber'} />
                </td>
                <td style={{ padding: '16px' }}>
                  <Badge text={g.impact} color={g.impact?.toLowerCase() === 'high' ? 'green' : g.impact?.toLowerCase() === 'low' ? 'gray' : 'blue'} />
                </td>
                <td style={{ padding: '16px', fontSize: '13px', color: '#374151', whiteSpace: 'nowrap' }}>
                  {g.timeframe}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SECTION 13 - PRIORITY ACTION PLAN */}
      <h2 style={{ ...sansFont, fontSize: '18px', fontWeight: 700, margin: '32px 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        13. Priority Action Plan
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {r.priority_action_plan?.sort((a, b) => a.rank - b.rank).map((a, i) => (
          <div key={i} style={{ ...cardStyle, display: 'flex', gap: '24px', marginBottom: 0 }}>
            <div style={{ 
              width: '40px', height: '40px', borderRadius: '50%', background: '#111827', color: '#fff', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              ...sansFont, fontSize: '18px', fontWeight: 800, flexShrink: 0 
            }}>
              {a.rank}
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ ...sansFont, fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>{a.action}</h3>
              <p style={{ fontSize: '15px', color: '#4b5563', lineHeight: 1.6, marginBottom: '16px' }}>{a.why}</p>
              
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <Badge text={`Effort: ${a.effort}`} />
                <Badge text={`Impact: ${a.impact}`} />
              </div>

              <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', padding: '16px', borderRadius: '6px' }}>
                <div style={{ ...sansFont, fontSize: '12px', fontWeight: 700, color: '#b45309', marginBottom: '4px', textTransform: 'uppercase' }}>
                  First Step Tomorrow →
                </div>
                <div style={{ fontSize: '14px', color: '#92400e', fontWeight: 500 }}>
                  {a.first_step}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* SECTION 14 - RAW DATA */}
      <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px dashed #d1d5db' }}>
        <button
          onClick={() => setShowRawData(!showRawData)}
          style={{ ...sansFont, display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: '#6b7280', fontSize: '14px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
        >
          {showRawData ? '▼ Hide' : '▶ Show'} Raw Scraped Data (Debug)
        </button>
        {showRawData && (
          <pre style={{ ...sansFont, background: '#111827', color: '#e5e7eb', padding: '16px', borderRadius: '8px', fontSize: '12px', overflowX: 'auto', maxHeight: '400px', overflowY: 'auto', marginTop: '16px' }}>
            {JSON.stringify(rawData || {}, null, 2)}
          </pre>
        )}
      </div>

    </div>
  );
}
