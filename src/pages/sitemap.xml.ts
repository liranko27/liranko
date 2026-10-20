import type { APIRoute } from 'astro';
import { business } from '../data/business';

export const GET: APIRoute = () => {
  if (!business.domain) {
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`, {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }

  const rootUrl = new URL('/', business.domain).href.replace(/&/g, '&amp;');
  const portfolioUrl = new URL('/portfolio', business.domain).href.replace(/&/g, '&amp;');

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url><loc>${rootUrl}</loc></url>
      <url><loc>${portfolioUrl}</loc></url>
      <url><loc>${new URL('/electrician-rosh-haayin', business.domain).href}</loc></url>
    </urlset>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
