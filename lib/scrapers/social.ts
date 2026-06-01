import { ApifyClient } from 'apify-client';
import { scrapeWebsite } from './web';

export interface SocialScrapeResult {
  bio: string;
  follower_count: number;
  recent_images_base64: string[];
  raw_data: Record<string, unknown>;
}

export function detectSocialPlatform(urlOrHandle: string): 'instagram' | 'youtube' | 'facebook' | 'tiktok' | 'twitter' | 'linkedin' | 'generic' {
  const lower = urlOrHandle.toLowerCase();
  if (lower.includes('instagram.com') || urlOrHandle.startsWith('@')) return 'instagram';
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('facebook.com') || lower.includes('fb.com')) return 'facebook';
  if (lower.includes('tiktok.com')) return 'tiktok';
  if (lower.includes('twitter.com') || lower.includes('x.com')) return 'twitter';
  if (lower.includes('linkedin.com')) return 'linkedin';
  return 'generic';
}

export async function scrapeSocialProfile(identifier: string): Promise<SocialScrapeResult> {
  const platform = detectSocialPlatform(identifier);
  
  if (platform === 'instagram') {
    let handle = identifier;
    if (handle.startsWith('@')) {
      handle = handle.slice(1);
    } else if (handle.includes('instagram.com/')) {
      const parts = handle.split('instagram.com/');
      const right = parts[1]?.split('/')[0]?.split('?')[0];
      if (right) handle = right;
    }
    
    try {
      console.log(`[Social Scraper] Attempting Apify Instagram scrape for: ${handle}`);
      return await scrapeInstagramProfile(handle);
    } catch (err) {
      console.warn(`[Social Scraper] Apify Instagram scrape failed. Falling back to Puppeteer.`, err);
    }
  }

  // Fallback to Puppeteer scraper for non-Instagram links (or failed Instagram apify runs)
  let targetUrl = identifier;
  if (targetUrl.startsWith('@')) {
    targetUrl = `https://instagram.com/${targetUrl.slice(1)}`;
  } else if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = `https://${targetUrl}`;
  }

  console.log(`[Social Scraper] Scraping ${platform} profile using Puppeteer fallback: ${targetUrl}`);
  const result = await scrapeWebsite(targetUrl);
  
  return {
    bio: result.text_content,
    follower_count: 0,
    recent_images_base64: [result.screenshot_base64],
    raw_data: {
      platform,
      url: targetUrl,
      ...result.raw_data
    }
  };
}

export async function scrapeInstagramProfile(handle: string): Promise<SocialScrapeResult> {
  const apifyToken = process.env.APIFY_API_TOKEN;
  if (!apifyToken) {
    throw new Error('APIFY_API_TOKEN is not set in environment variables');
  }

  const client = new ApifyClient({ token: apifyToken });

  // Start the actor apify/instagram-profile-scraper
  const run = await client.actor('apify/instagram-profile-scraper').call({
    usernames: [handle],
    resultsLimit: 1, // Only need the profile data
  });

  // Fetch results from dataset
  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  if (!items || items.length === 0) {
    throw new Error(`Could not find profile for handle: ${handle}`);
  }

  const profile = items[0] as any;
  const bio = profile.biography || '';
  const follower_count = profile.followersCount || 0;

  // Extract up to 3 image URLs from the user's latest posts
  const recent_images_base64: string[] = [];
  const latestPosts = profile.latestPosts || [];

  for (let i = 0; i < Math.min(3, latestPosts.length); i++) {
    const post = latestPosts[i];
    const imageUrl = post.displayUrl || post.imageUrl;
    if (imageUrl) {
      try {
        const response = await fetch(imageUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const base64 = buffer.toString('base64');
          const mimeType = response.headers.get('content-type') || 'image/jpeg';
          recent_images_base64.push(`data:${mimeType};base64,${base64}`);
        } else {
          console.warn(`[Social Scraper] Failed to fetch image ${imageUrl}: Status ${response.status}`);
        }
      } catch (err) {
        console.warn(`[Social Scraper] Failed to fetch image ${imageUrl}:`, err);
      }
    }
  }

  return {
    bio,
    follower_count,
    recent_images_base64,
    raw_data: profile,
  };
}
