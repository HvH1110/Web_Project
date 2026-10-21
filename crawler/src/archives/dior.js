// Dior product pages as archived by the Wayback Machine. The live site blocks
// crawlers (SOURCES.md); archived pages carry JSON-LD Product + Offer, e.g.
// Small Lady Dior My ABCDior Bag, M0538ONGE_M27V, SGD 9300 (Apr 2024). The
// ref is Dior's style code with its colour variant.
import * as cheerio from 'cheerio';
import { parseJsonLdProduct } from './common.js';

export function diorArchive({ market, locale, currency }) {
  return {
    id: `dior-${market.toLowerCase()}`,
    name: 'Dior',
    type: 'official',
    market,
    // Product URLs moved from /products/couture-<code>-... to /fashion/products/<code>-...
    prefixes: [`www.dior.com/${locale}/fashion/products/`, `www.dior.com/${locale}/products/`],
    isProductUrl: (url) => new RegExp(`^https://www[.]dior[.]com/${locale}/(fashion/)?products/[^/]+`).test(url),
    parse: (html, url) => parseJsonLdProduct(cheerio.load(html), url, { brand: 'dior', currency }),
  };
}
