// Louis Vuitton product pages as archived by the Wayback Machine. The live
// site blocks crawlers (SOURCES.md); archived pages carry JSON-LD Product +
// Offer, e.g. Capucines MM Souple, M12929, SGD 11000 (Dec 2025).
import * as cheerio from 'cheerio';
import { parseJsonLdProduct } from './common.js';

export function louisVuittonArchive({ market, host, locale, currency }) {
  return {
    id: `louisvuitton-${market.toLowerCase()}`,
    name: 'Louis Vuitton',
    type: 'official',
    market,
    prefixes: [`${host}/${locale}/products/`],
    isProductUrl: (url) => new RegExp(`^https://${host}/${locale}/products/[^/]+`).test(url),
    parse: (html, url) => parseJsonLdProduct(cheerio.load(html), url, { brand: 'louis-vuitton', currency }),
  };
}
