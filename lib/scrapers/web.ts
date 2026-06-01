import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export interface WebScrapeResult {
  text_content: string;
  meta_tags: Record<string, string>;
  screenshot_base64: string;
  raw_data: Record<string, unknown>;
}

export async function scrapeWebsite(url: string): Promise<WebScrapeResult> {
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
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1000 });

    // FIX: Use 'domcontentloaded' instead of 'networkidle2'.
    // networkidle2 waits until there are ≤2 open network connections for 500ms —
    // large sites like Adidas/Nike constantly fire analytics & ad trackers so they
    // NEVER reach idle state, causing the 30s timeout every single time.
    // domcontentloaded fires as soon as the HTML is parsed and the DOM is ready,
    // which is all we need for a visual screenshot.
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Give the page 2 seconds to paint — lets hero images and above-the-fold
    // CSS finish rendering before we take the screenshot
    await new Promise(resolve => setTimeout(resolve, 2000));

    const screenshotBase64 = await page.screenshot({
      fullPage: false,
      type: 'jpeg',
      quality: 60,
      encoding: 'base64',
    }) as string;

    screenshot_base64 = `data:image/jpeg;base64,${screenshotBase64}`;
  } catch (err) {
    console.error('[Web Scraper] Screenshot failed:', err);
    throw new Error(`Failed to generate screenshot for ${targetUrl}`);
  } finally {
    await browser.close();
  }

  const rawData = $('h1, h2, h3, p, span, a').text().replace(/\s+/g, ' ').trim();

  return {
    text_content,
    meta_tags,
    screenshot_base64,
    raw_data: {
      url: targetUrl,
      title: $('title').text(),
      heading_count: headings.length,
      paragraph_count: bodyText.length,
      raw_text: rawData,
    },
  };
}