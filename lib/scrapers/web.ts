import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { uploadScreenshot } from '@/lib/supabase/storage';

export interface WebScrapeResult {
  text_content: string;
  meta_tags: Record<string, string>;
  screenshot_base64: string;
  screenshot_url: string;
  screenshot_fullpage_url: string;
  raw_data: Record<string, unknown>;
}

export async function scrapeWebsite(url: string, leadId: string): Promise<WebScrapeResult> {
  const targetUrl = url.startsWith('http') ? url : `https://${url}`;

  // Fetch HTML with timeout so slow/hanging sites don't block the pipeline
  const controller = new AbortController();
  const fetchTimeout = setTimeout(() => controller.abort(), 15000);

  const response = await fetch(targetUrl, { signal: controller.signal });
  clearTimeout(fetchTimeout);

  if (!response.ok) {
    throw new Error(`Failed to fetch website ${targetUrl}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Extract meta tags
  const meta_tags: Record<string, string> = {};
  $('meta').each((_, element) => {
    const name = $(element).attr('name') || $(element).attr('property');
    const content = $(element).attr('content');
    if (name && content) {
      meta_tags[name] = content;
    }
  });

  // Extract visible text — headings + body text for richer brand signal
  const headings: string[] = [];
  $('h1, h2, h3').each((_, el) => {
    const text = $(el).text().trim();
    if (text) headings.push(text);
  });

  const bodyText: string[] = [];
  $('p, li').each((_, el) => {
    const text = $(el).text().trim();
    if (text) bodyText.push(text);
  });

  const text_content = `
# Headings
${headings.join('\n')}

# Body Text
${bodyText.join('\n')}
  `.trim();

  // Puppeteer Screenshot
  const isLocal = process.env.NODE_ENV === 'development';
  let browser;

  if (isLocal) {
    browser = await puppeteer.launch({
      channel: 'chrome',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  } else {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  let screenshot_base64 = '';
  let screenshot_url = '';
  let screenshot_fullpage_url = '';

  try {
    const page = await browser.newPage();
    
    // 1. SCREENSHOT FOR GEMINI (Low res, smaller viewport)
    await page.setViewport({ width: 800, height: 600 });
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Give the page 2 seconds to paint hero images
    await new Promise(resolve => setTimeout(resolve, 2000));

    const geminiBase64 = await page.screenshot({
      fullPage: false,
      type: 'jpeg',
      quality: 30,
      encoding: 'base64',
    }) as string;
    
    screenshot_base64 = `data:image/jpeg;base64,${geminiBase64}`;

    // 2. SCREENSHOT ABOVE FOLD (High res, larger viewport for PDF)
    await page.setViewport({ width: 1280, height: 800 });
    
    const aboveFoldBase64 = await page.screenshot({
      fullPage: false,
      type: 'jpeg',
      quality: 85,
      encoding: 'base64',
    }) as string;
    
    screenshot_url = await uploadScreenshot(leadId, aboveFoldBase64, 'above-fold');

    // 3. SCREENSHOT FULL PAGE (High res for PDF)
    const fullPageBase64 = await page.screenshot({
      fullPage: true,
      type: 'jpeg',
      quality: 80,
      encoding: 'base64',
    }) as string;

    screenshot_fullpage_url = await uploadScreenshot(leadId, fullPageBase64, 'full-page');

  } catch (err) {
    console.error('[Web Scraper] Screenshot pipeline failed (non-fatal):', err);
    // Non-fatal, we continue returning empty URLs
  } finally {
    await browser.close();
  }

  const rawData = $('h1, h2, h3, p, span, a').text().replace(/\s+/g, ' ').trim();

  return {
    text_content,
    meta_tags,
    screenshot_base64,
    screenshot_url,
    screenshot_fullpage_url,
    raw_data: {
      url: targetUrl,
      title: $('title').text(),
      heading_count: headings.length,
      paragraph_count: bodyText.length,
      raw_text: rawData,
    },
  };
}