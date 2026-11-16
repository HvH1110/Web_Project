import { politeFetch } from './http.js';

// Sitemaps are large (Cartier's: 600 KB) and a whole source waits on this one request.
const SITEMAP_TIMEOUT_MS = 60000;

// Returns every <loc> URL of a sitemap (not recursive: pass a leaf sitemap).
// Errors marked `retryable` are worth one more try (lib/runner.js).
export async function fetchSitemapUrls(url) {
  const res = await politeFetch(url, { timeoutMs: SITEMAP_TIMEOUT_MS });
  if (!res.ok) {
    throw Object.assign(new Error(`sitemap ${url} answered HTTP ${res.status}`), { retryable: res.status >= 500 && res.status !== 503 });
  }
  const xml = await res.text();
  // A sitemap cut short would pass for a site with fewer products.
  if (!xml.includes('</urlset>')) {
    throw Object.assign(new Error(`sitemap ${url} is incomplete (${xml.length} characters, no closing tag)`), { retryable: true });
  }
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
}
