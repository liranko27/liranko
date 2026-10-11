import type { APIRoute } from 'astro';
import { business } from '../data/business';

export const GET: APIRoute = () => new Response(
  business.domain
    ? `User-agent: *\nAllow: /\nAllow: /portfolio\nSitemap: ${new URL('/sitemap.xml', business.domain).href}\n`
    : 'User-agent: *\nDisallow: /\n',
  { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
);
