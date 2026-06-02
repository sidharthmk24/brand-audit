-- ============================================================
-- Brand Audit Platform — Database Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL > New Query)
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===================
-- LEADS Table
-- ===================
-- Stores onboarding form submissions. Each row = one prospective client.
CREATE TABLE leads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,
  company_name  TEXT,
  industry      TEXT,
  identifier    TEXT NOT NULL,
  input_type    TEXT NOT NULL CHECK (input_type IN ('website', 'social')),
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'processing', 'awaiting_review', 'sent', 'failed'))
);

-- Performance indexes
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);

-- ===================
-- AUDIT_REPORTS Table
-- ===================
-- Stores the pipeline results for each lead.
-- raw_data: JSONB dump from Cheerio/Apify scraping
-- report_content: Strictly typed AI output (BrandScore, ActionableUpgrades, etc.)
-- pdf_url: Link to generated PDF in Supabase Storage
CREATE TABLE audit_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_data        JSONB,
  report_content  JSONB,
  pdf_url         TEXT,
  error_stage     TEXT,
  error_message   TEXT
);

CREATE INDEX idx_audit_reports_lead_id ON audit_reports(lead_id);

-- ===================
-- Supabase Storage Bucket
-- ===================
-- Run this separately if you want to create the storage bucket via SQL:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('audit-reports', 'audit-reports', true);
