import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import * as cheerio from 'cheerio';

export async function POST(req: Request) {
  try {
    const { brandName, industry } = await req.json();

    if (!brandName) {
      return NextResponse.json({ error: 'brandName is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: 'The official name of the brand' },
          websiteUrl: { type: Type.STRING, description: 'The official website URL (e.g. https://www.brand.com)' },
          socialLinks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                platform: { type: Type.STRING, description: 'e.g., instagram, linkedin, twitter, facebook' },
                url: { type: Type.STRING }
              },
              required: ['platform', 'url']
            }
          }
        },
        required: ['name', 'websiteUrl', 'socialLinks']
      }
    };

    const prompt = `
Search the web for the brand "${brandName}" in the industry/target audience "${industry || 'general'}".
Find up to 5 of the most likely official brands or top competitors matching this description.
If you cannot find the exact brand, find the closest matches or the top 5 ranking entities in that space. If you absolutely cannot find anything remotely similar, return an empty array [].

CRITICAL: You MUST specifically look for their official Instagram and LinkedIn pages. Do not just return the website.

You MUST return strictly valid JSON matching this schema:
[
  {
    "name": "Official brand name",
    "websiteUrl": "https://example.com",
    "socialLinks": [ { "platform": "instagram", "url": "..." } ]
  }
]

Do not return any markdown formatting, do not include \`\`\`json blocks. Just the raw JSON array. No conversational text.
    `.trim();

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.1,
        tools: [{ googleSearch: {} }],
      },
    });

    if (!response.text) {
      return NextResponse.json({ brands: [] });
    }

    // Clean up potential markdown formatting if the AI disobeys
    let jsonText = response.text.trim();
    if (jsonText.startsWith('\`\`\`json')) {
      jsonText = jsonText.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
    } else if (jsonText.startsWith('\`\`\`')) {
      jsonText = jsonText.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();
    }

    let brands = [];
    try {
      brands = JSON.parse(jsonText);
    } catch (parseError) {
      console.warn('[search-brands] Failed to parse JSON, falling back to empty array. Raw output:', jsonText);
      brands = []; // Fallback gracefully so the UI shows the manual entry option
    }

    // Hybrid Approach: Scrape hompages for official social links
    if (brands && Array.isArray(brands)) {
      await Promise.all(
        brands.map(async (brand: any) => {
          if (!brand.websiteUrl) return;
          
          // Save Gemini's found socials as a fallback
          const fallbackSocials = brand.socialLinks || [];
          brand.socialLinks = []; // Clear them so website footer is the primary source of truth
          
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout per scrape
            
            const res = await fetch(brand.websiteUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (res.ok) {
              const html = await res.text();
              const $ = cheerio.load(html);
              
              const platforms = ['instagram', 'linkedin', 'twitter', 'facebook', 'tiktok', 'youtube'];
              
              $('a').each((_, el) => {
                const href = $(el).attr('href');
                if (!href || href.startsWith('/')) return;
                
                for (const platform of platforms) {
                  if (href.toLowerCase().includes(`${platform}.com`) || (platform === 'twitter' && href.toLowerCase().includes('x.com'))) {
                    // Prevent duplicates in the scraped array
                    if (!brand.socialLinks.some((s: any) => s.platform.toLowerCase() === platform)) {
                      brand.socialLinks.push({ platform, url: href });
                    }
                  }
                }
              });
            }
          } catch (e) {
            // Silently ignore fetch errors
          }
          
          // If scraping the website yielded absolutely no socials, do a focused Google Search for this specific brand
          if (brand.socialLinks.length === 0) {
            try {
              const socialPrompt = `Act as a precise OSINT (Open Source Intelligence) and data aggregation engine. Your task is to find all official, verified, or highly active social media URLs (Instagram, LinkedIn, Twitter/X, Facebook, TikTok, YouTube) for the brand "${brand.name}" (Website reference: "${brand.websiteUrl}").

Follow these extraction protocols strictly:
1. Direct Crawl: Check the primary website home, contact, and about pages for hardcoded social links.
2. Handle Permutations: Search cross-platform using direct handle matching for "${brand.name}", "${brand.name}clothing", "${brand.name}official", and "${brand.name}_".
3. SERP Cross-Reference: Search search engines explicitly querying "${brand.name} + [Platform Name]" to bypass missing website links.
4. Cross-Platform Linking: Check the bio links (e.g., Linktree, Instagram Bio, Facebook 'About' section) of any found platform to see if they link to the other missing channels.

Return strictly a valid JSON array matching this schema, with no markdown code blocks, no conversational text, and no commentary. If absolutely no URLs are found across any channel after performing these steps, return an empty array [].

Schema:
[{"platform": "platform_name", "url": "https://..."}]`;
              const socialResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [{ role: 'user', parts: [{ text: socialPrompt }] }],
                config: { temperature: 0.1, tools: [{ googleSearch: {} }] },
              });
              
              if (socialResponse.text) {
                let jText = socialResponse.text.trim();
                if (jText.startsWith('\`\`\`json')) jText = jText.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
                else if (jText.startsWith('\`\`\`')) jText = jText.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();
                
                const parsedSocials = JSON.parse(jText);
                if (Array.isArray(parsedSocials) && parsedSocials.length > 0) {
                  brand.socialLinks = parsedSocials;
                }
              }
            } catch (e) {
              // If focused search fails, use the initial broad search fallback
              if (fallbackSocials.length > 0) {
                brand.socialLinks = fallbackSocials;
              }
            }
          }
        })
      );
    }

    return NextResponse.json({ brands });

  } catch (error: any) {
    console.error('[search-brands] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to search brands' }, { status: 500 });
  }
}
