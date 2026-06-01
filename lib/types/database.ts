// ============================================================
// Database Types — Supabase Schema
// ============================================================

// --- Enums ---

export type InputType = 'website' | 'social';

export type LeadStatus =
  | 'pending'
  | 'processing'
  | 'awaiting_review'
  | 'pdf_ready'
  | 'sent'
  | 'failed';

// --- LEADS Table ---

export interface Lead {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  brand_name: string | null;
  industry: string | null;
  identifier: string;
  input_type: InputType;
  status: LeadStatus;
  pdf_generated: boolean;
  pdf_sent: boolean;
}

// --- AI Report Output Types (Strict) ---

export interface BrandScore {
  visual_consistency: number;
  messaging_clarity: number;
  audience_alignment: number;
  brand_foundation: number;
  digital_presence: number;
  overall: number;
}

export interface BrandFoundation {
  purpose_statement: string;
  mission_vision_values: string;
  positioning: string;
  target_audience: string;
  personality_tone: string;
  social_media_signals: string;
  what_is_missing: string;
}

export interface CompetitorAnalysisLevel {
  competitor_names: string[];
  how_brand_matches: string[];
  where_brand_lags: string[];
  competitive_implications: string;
  recommended_priorities: string[];
}

export interface CompetitorLandscape {
  regional: CompetitorAnalysisLevel;
  national: CompetitorAnalysisLevel;
  international: CompetitorAnalysisLevel;
}

export interface VisualIdentityAudit {
  logo_usage: string;
  logo_impression: string;
  colour_palette: string;
  typography: string;
  imagery_style: string;
  overall_brand_system: string;
}

export interface WebsiteAudit {
  first_impression: string;
  messaging_clarity: string;
  tone_consistency: string;
  visual_consistency: string;
  user_experience: string;
  seo_discoverability: string;
  ctas_conversion: string;
}

export interface SocialPlatformAudit {
  platform: string;
  profile_completeness: string;
  content_themes: string;
  tone_consistency: string;
  visual_consistency: string;
  engagement_quality: string;
  posting_frequency: string;
}

export interface SocialMediaAudit {
  platforms: SocialPlatformAudit[];
  cross_platform_summary: string;
}

export interface ContentAudit {
  content_overview: string;
  content_strengths: string;
  content_gaps: string;
  content_recommendations: string;
}

export interface VerbalIdentityAudit {
  website_message: string;
  social_voice: string;
  naming_consistency: string;
  employee_story: string;
  overall_assessment: string;
}

export interface AudiencePerception {
  what_customers_say: string;
  perceived_strengths: string;
  compared_with_competitors: string;
  overall_read: string;
}

export interface KeyFindingsSummary {
  strengths: string[];
  inconsistencies: string[];
  gaps: string[];
  brand_foundation_summary: string;
  audience_tone_summary: string;
  competitive_read: string;
}

export interface GrowthOpportunity {
  opportunity: string;
  effort: string;
  impact: string;
  timeframe: string;
  why_now: string;
}

export interface PriorityAction {
  rank: number;
  action: string;
  why: string;
  effort: string;
  impact: string;
  first_step: string;
}

export interface ReportContent {
  scores: BrandScore;
  executive_summary: string;
  brand_foundation: BrandFoundation;
  competitors: CompetitorLandscape;
  visual_identity: VisualIdentityAudit;
  website_audit: WebsiteAudit;
  social_media_audit: SocialMediaAudit;
  content_audit: ContentAudit;
  verbal_identity: VerbalIdentityAudit;
  audience_perception: AudiencePerception;
  key_findings: KeyFindingsSummary;
  growth_opportunities: GrowthOpportunity[];
  priority_action_plan: PriorityAction[];
}

// --- AUDIT_REPORTS Table ---

export interface AuditReport {
  id: string;
  lead_id: string;
  created_at: string;
  /** Raw scraped data (Cheerio HTML or Apify JSON) */
  raw_data: Record<string, unknown> | null;
  /** Strictly typed AI report output */
  report_content: ReportContent | null;
  /** URL of the generated PDF in Supabase Storage */
  pdf_url: string | null;
  /** Pipeline stage where failure occurred */
  error_stage: string | null;
  /** Error message / stack trace */
  error_message: string | null;
}

// --- Supabase Database type helper ---
// Must match GenericSchema: Tables (with Relationships), Views, Functions

export type LeadInsert = Omit<Lead, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export type LeadUpdate = Partial<Omit<Lead, 'id'>>;

export type AuditReportInsert = Omit<AuditReport, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export type AuditReportUpdate = Partial<Omit<AuditReport, 'id'>>;

export interface Database {
  public: {
    Tables: {
      leads: {
        Row: Lead;
        Insert: LeadInsert;
        Update: LeadUpdate;
        Relationships: [
          {
            foreignKeyName: 'audit_reports_lead_id_fkey';
            columns: ['id'];
            isOneToOne: false;
            referencedRelation: 'audit_reports';
            referencedColumns: ['lead_id'];
          },
        ];
      };
      audit_reports: {
        Row: AuditReport;
        Insert: AuditReportInsert;
        Update: AuditReportUpdate;
        Relationships: [
          {
            foreignKeyName: 'audit_reports_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
  };
}
