# Brand Auditor Architecture & Business Rules

## 1. Project Context
This is an automated Brand Auditing tool designed for lead generation. It analyzes a brand's digital presence (either a website or a social media profile) and generates a strategic PDF roadmap. The AI acts as a Chief Brand Officer evaluating identity, not just a technical SEO crawler.

## 2. The Asynchronous Pipeline (Crucial)
Do NOT run scraping, Puppeteer, or LLM tasks synchronously in API routes. 
- The `/api/submit` endpoint must validate the input, save a `pending` row to Supabase, and immediately respond to the client with a success state.
- Use Next.js `after(async () => { ... })` to execute the heavy pipeline in the background: Scraping -> AI Analysis -> PDF Generation -> Emailing.

## 3. Database Schema Requirements (Supabase)
The `LEADS` table must accommodate the dual-input nature of the app:
- `identifier`: text (Stores the URL or the social handle).
- `input_type`: text (Enum: 'website', 'social').
- `status`: text (pending, processing, awaiting_review, sent, failed).

The `AUDIT_REPORTS` table stores the pipeline results:
- `raw_data`: jsonb (Stores Cheerio HTML dumps or Apify JSON payloads).
- `report_content`: jsonb (Stores the structured output from Gemini).
- `pdf_url`: text (Link to the generated report in Supabase Storage).
- `error_stage`: text (Logs where the pipeline failed if an exception occurs).

## 4. LLM Guidelines
We use `gemini-2.0-flash`. 
- Always enforce strict JSON schemas for the output.
- Pass base64 image buffers directly to Gemini to allow it to evaluate visual cohesion, typography, and color palettes.