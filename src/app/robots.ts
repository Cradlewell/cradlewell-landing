import { MetadataRoute } from 'next';

// A crawler follows only the most specific group that names it, so the AI
// crawlers below need the same disallow lines as everyone else.
const DISALLOW = ['/thankyou', '/api/'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      ...['GPTBot', 'OAI-SearchBot', 'ClaudeBot', 'PerplexityBot'].map((userAgent) => ({
        userAgent,
        allow: '/',
        disallow: DISALLOW,
      })),
    ],
    sitemap: 'https://www.cradlewell.com/sitemap.xml',
  };
}
