import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Future-proof: allow Puppeteer/Chromium to be loaded as external packages
  // in serverless/Node.js runtime (needed for screenshot + PDF pipeline)
  serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
};

export default nextConfig;
