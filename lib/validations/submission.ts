import { z } from 'zod';
import type { InputType } from '@/lib/types/database';

// ============================================================
// Submission Form — Zod Validation Schema
// ============================================================

export const submissionSchema = z.object({
  name: z
    .string()
    .max(100, 'Name is too long')
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(val => !val || z.string().email().safeParse(val).success, {
      message: 'Please enter a valid email address',
    }),
  phone: z
    .string()
    .max(20, 'Phone number is too long')
    .optional()
    .or(z.literal('')),
  company_name: z
    .string()
    .max(100, 'Company name is too long')
    .optional()
    .or(z.literal('')),
  industry: z
    .string()
    .max(100, 'Industry is too long')
    .optional()
    .or(z.literal('')),
  identifier: z
    .string()
    .min(3, 'Please enter a valid URL or social media link'),
});

export const initialSubmissionSchema = z.object({
  company_name: z
    .string()
    .min(2, 'Please enter your brand name'),
});

export const detailsSubmissionSchema = z.object({
  name: z
    .string()
    .max(100, 'Name is too long')
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address'),
  phone: z
    .string()
    .max(20, 'Phone number is too long')
    .optional()
    .or(z.literal('')),
  company_name: z
    .string()
    .max(100, 'Company name is too long')
    .min(1, 'Brand name is required'),
  industry: z
    .string()
    .min(1, 'Please select an industry')
    .max(100, 'Industry is too long'),
  website: z.string().optional().or(z.literal('')),
  instagram: z.string().optional().or(z.literal('')),
});

export type SubmissionFormData = z.infer<typeof submissionSchema>;

// ============================================================
// Input Type Detection + Social Media URL Sanitizer
// ============================================================

const INSTAGRAM_URL_REGEX =
  /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)\/?(?:\?.*)?$/i;

const INSTAGRAM_HANDLE_REGEX = /^@?([a-zA-Z0-9._]{1,30})$/;

interface SanitizedInput {
  type: InputType;
  /** Cleaned identifier — raw handle for Instagram, normalized URL for websites/others */
  cleanIdentifier: string;
}

export function detectAndSanitizeInput(raw: string): SanitizedInput {
  const trimmed = raw.trim();

  // If the input starts with '@', it's always social media (default to instagram handle format)
  if (trimmed.startsWith('@')) {
    return {
      type: 'social',
      cleanIdentifier: trimmed.toLowerCase(),
    };
  }

  // List of domains that classify the URL as a social media profile
  const socialDomains = [
    'instagram.com',
    'facebook.com',
    'fb.com',
    'twitter.com',
    'x.com',
    'linkedin.com',
    'tiktok.com',
    'youtube.com',
    'youtu.be',
    'pinterest.com'
  ];

  const lower = trimmed.toLowerCase();
  const isSocialDomain = socialDomains.some(domain => lower.includes(domain));

  if (isSocialDomain) {
    let normalized = trimmed;
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = `https://${normalized}`;
    }

    // Special clean-up for Instagram full URLs to standard `@username` format
    const igUrlMatch = normalized.match(INSTAGRAM_URL_REGEX);
    if (igUrlMatch) {
      return {
        type: 'social',
        cleanIdentifier: `@${igUrlMatch[1].toLowerCase()}`,
      };
    }

    // For other social links, keep the full URL but ensure it's normalized
    return {
      type: 'social',
      cleanIdentifier: normalized,
    };
  }

  // Check if it's a bare handle that might be instagram (no slashes, no dots, etc.)
  const igHandleMatch = trimmed.match(INSTAGRAM_HANDLE_REGEX);
  if (igHandleMatch && !trimmed.includes('/') && !trimmed.includes('://')) {
    const potentialDomain = trimmed.replace(/^@/, '');
    const hasTLD = /\.(com|org|net|io|co|app|dev|xyz|me|info|biz)$/i.test(potentialDomain);
    if (!hasTLD) {
      return {
        type: 'social',
        cleanIdentifier: `@${igHandleMatch[1].toLowerCase()}`,
      };
    }
  }

  // Otherwise, treat as website URL
  let normalizedUrl = trimmed;
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  return {
    type: 'website',
    cleanIdentifier: normalizedUrl,
  };
}

// ============================================================
// Industry Options (for the UI dropdown)
// ============================================================

export const INDUSTRY_OPTIONS = [
  'SaaS / Technology',
  'E-commerce / Retail',
  'Fashion & Apparel',
  'Health & Wellness',
  'Real Estate',
  'Finance & Fintech',
  'Food & Beverage',
  'Education & EdTech',
  'Travel & Hospitality',
  'Automotive & Mobility',
  'Conglomerate / Multi-Sector',
  'Marketing & Agency',
  'Entertainment & Media',
  'Non-Profit',
  'Other',
] as const;
