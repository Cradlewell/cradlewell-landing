import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Content-Security-Policy: which sites the pages may load scripts, styles,
// fonts, images and connections from. It is in Report-Only mode: nothing is
// blocked yet; browsers report what would have been blocked to
// /api/csp-report (visible in the Vercel logs). Once the logs show only
// expected reports, rename the header to Content-Security-Policy to enforce it.
const dev = process.env.NODE_ENV === 'development';
const csp = [
  "default-src 'self'",
  // 'unsafe-inline': the site and Next.js use inline scripts (tracking stubs,
  // structured data). 'unsafe-eval' only for the dev server.
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''} https://www.googletagmanager.com https://connect.facebook.net https://www.google-analytics.com https://googleads.g.doubleclick.net https://www.googleadservices.com https://www.google.com https://capi-automation.s3.us-east-2.amazonaws.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://www.google.com https://googleads.g.doubleclick.net https://www.googleadservices.com https://*.facebook.com https://connect.facebook.net https://server-side-tagging-nttyza67na-uc.a.run.app https://capi-automation.s3.us-east-2.amazonaws.com",
  "frame-src 'self' https://www.googletagmanager.com https://td.doubleclick.net https://www.facebook.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  'report-uri /api/csp-report',
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  // Pin the workspace root — a stray lockfile above this folder otherwise makes
  // Turbopack resolve modules against the wrong node_modules.
  turbopack: { root: __dirname },
  // The CRM is one app at /crm now; old sub-pages go there.
  async redirects() {
    return ['leads', 'followups', 'pipeline', 'reports', 'quotations', 'invoice', 'nearby-staff'].map((p) => ({
      source: `/crm/${p}`,
      destination: '/crm',
      permanent: false,
    }));
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // L4: Security headers — trust signal for healthcare YMYL + ranking signal
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy-Report-Only',
            value: csp,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
