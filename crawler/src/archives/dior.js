// Dior product pages as archived by the Wayback Machine. The live site blocks
// crawlers (SOURCES.md); archived pages carry JSON-LD Product + Offer, e.g.
// Small Lady Dior My ABCDior Bag, M0538ONGE_M27V, SGD 9300 (Apr 2024). The
// ref is Dior's style code with its colour variant.
import * as cheerio from 'cheerio';
import { parseJsonLdProduct } from './common.js';

// The product's own gallery pictures, in page order. JSON-LD lists only one or
// two. Since 2023: assets.christiandior.com/.../diorprod/M0505OWCBM323_E01-1;
// before: wwws.dior.com/.../1666251915_S5685CCEH_M900_E01_GH.jpg, one per view
// (E01, E03, ...) in several sizes. Other colours of the product are skipped.
function galleryImages($, ref) {
  const current = new RegExp(`/diorprod/${ref.replace('_', '')}_`);
  const older = new RegExp(`_${ref}_(E[0-9]+)_`);
  const byView = new Map();
  $('img[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (!/^https:\/\//.test(src)) return;
    const path = new URL(src).pathname;
    const view = path.match(older)?.[1] ?? (current.test(path) ? path : null);
    if (view && !byView.has(view)) byView.set(view, src);
  });
  return [...byView.values()];
}

export function diorArchive({ market, locale, currency }) {
  return {
    id: `dior-${market.toLowerCase()}`,
    name: 'Dior',
    type: 'official',
    market,
    // Product URLs moved from /products/couture-<code>-... to /fashion/products/<code>-...
    prefixes: [`www.dior.com/${locale}/fashion/products/`, `www.dior.com/${locale}/products/`],
    isProductUrl: (url) => new RegExp(`^https://www[.]dior[.]com/${locale}/(fashion/)?products/[^/]+`).test(url),
    parse: (html, url) => {
      const $ = cheerio.load(html);
      const item = parseJsonLdProduct($, url, { brand: 'dior', currency });
      if (!item) return null;
      // Older pages put the size in the sku (S5685CCEH_M900_TU): keep style + colour.
      item.ref = item.ref.split('_').slice(0, 2).join('_');
      const seen = new Set();
      item.images = [...galleryImages($, item.ref).map((src) => ({ url: src, alt: item.name })), ...item.images]
        .filter(({ url: src }) => !seen.has(new URL(src).pathname) && seen.add(new URL(src).pathname))
        .slice(0, 4);
      return item;
    },
  };
}
