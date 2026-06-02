# Required Skills & Tech Stack Standards

## Frontend Ecosystem & UI
- **Next.js 16.2 (App Router):** Utilize server components by default. Use client components (`"use client"`) only at the leaf nodes for interactivity.
- **React 19:** Leverage the latest hooks and concurrent rendering features.
- **Tailwind CSS v4:** Use utility-first styling for layouts and responsive design.
- **Animation (GSAP & Framer Motion):** The UI must be highly polished and pixel-perfect. Use Framer Motion for layout transitions, modals, and micro-interactions. Use GSAP for complex, scroll-triggered timeline animations on the landing page hero sections.

## Backend & Infrastructure
- **Supabase:** Use `@supabase/supabase-js`. Build robust relational tables using PostgreSQL and leverage JSONB columns for dynamic audit data.
- **Next.js `after()`:** Master the usage of the `after()` utility for non-blocking background microtasks.
- **Puppeteer / Chromium:** Configure headless browsers for serverless environments (e.g., using `@sparticuz/chromium`) to capture visual screenshots and render native A4 PDFs from HTML templates.

## Code Quality & Error Handling
- Strictly use TypeScript with rigorous interface definitions, especially for JSONB database columns and Gemini LLM outputs.
- Build resilient error handling for the async pipeline. Use `Promise.allSettled` when running parallel scrapers. 
- If a scraper or API fails, catch the error gracefully, save the `error_stage` and stack trace to the Supabase database, and halt that specific lead's pipeline without crashing the entire server.