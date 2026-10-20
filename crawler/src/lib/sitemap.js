import { politeFetch } from './http.js';

// Returns every <loc> URL of a sitemap (not recursive: pass a leaf sitemap).
export async function fetchSitemapUrls(url) {
  const res = await politeFetch(url);
  if (!res.ok) throw new Error(`sitemap ${url} answered HTTP ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
}
