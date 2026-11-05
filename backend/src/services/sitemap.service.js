import { env } from '../config/env.js';
import { Brand } from '../models/brand.model.js';
import { PricePoint } from '../models/price-point.model.js';
import { Product } from '../models/product.model.js';

// The public frontend pages with fixed URLs (frontend/src/router.jsx). Community and
// account pages are noindexed, so they stay out.
const STATIC_PATHS = ['/', '/search', '/deals'];
// The most URLs a sitemap file may hold.
const MAX_URLS = 50_000;
const CACHE_MS = 60 * 60 * 1000;

const XML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
const escapeXml = (text) => text.replace(/[&<>"']/g, (char) => XML_ESCAPES[char]);

function urlEntry(path, lastmod) {
  const date = lastmod ? `<lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>` : '';
  return `<url><loc>${escapeXml(`${env.clientOrigin}${path}`)}</loc>${date}</url>`;
}

// When a product page last really changed: its latest price change, or when the
// product was added. Not updatedAt, which every crawl moves. The later of the two,
// because a price recovered from an archive can be older than the product.
function lastChanged(createdAt, lastPriceAt) {
  if (!createdAt || !lastPriceAt) {
    return createdAt ?? lastPriceAt ?? null;
  }
  return createdAt > lastPriceAt ? createdAt : lastPriceAt;
}

// Brand pages have no lastmod: a brand's updatedAt moves whenever the seed runs.
async function buildSitemap() {
  const [brands, products, lastPrices] = await Promise.all([
    Brand.find().sort({ order: 1, name: 1 }).select('slug -_id').lean(),
    Product.find().sort({ brand: 1, ref: 1 }).limit(MAX_URLS).select('brand ref createdAt').lean(),
    PricePoint.aggregate([{ $group: { _id: '$productId', at: { $max: '$observedAt' } } }]),
  ]);
  const lastPriceAt = new Map(lastPrices.map(({ _id, at }) => [String(_id), at]));
  const urls = [
    ...STATIC_PATHS.map((path) => urlEntry(path)),
    ...brands.map(({ slug }) => urlEntry(`/brands/${slug}`)),
    // The same URL as productPath() in frontend/src/lib/catalog.js.
    ...products.map(({ _id, brand, ref, createdAt }) =>
      urlEntry(`/products/${brand}/${encodeURIComponent(ref)}`, lastChanged(createdAt, lastPriceAt.get(String(_id)))),
    ),
  ].slice(0, MAX_URLS);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

let cached = null;

// The sitemap as XML, rebuilt at most every CACHE_MS. Requests arriving during a
// build share it. Failures aren't kept.
export function loadSitemap(now = Date.now()) {
  if (cached && cached.expiresAt > now) {
    return cached.xml;
  }
  const entry = { expiresAt: now + CACHE_MS, xml: buildSitemap() };
  cached = entry;
  entry.xml.catch(() => {
    if (cached === entry) {
      cached = null;
    }
  });
  return entry.xml;
}

export function clearSitemapCache() {
  cached = null;
}
