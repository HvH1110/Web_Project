// IWC watch pages as archived by the Wayback Machine. The live site blocks
// crawlers (SOURCES.md). Archived pages carry schema.org microdata and
// data-product-* attributes, e.g. IW545901, "S$ 110,000" (Jun 2024). Older
// snapshots often show no price.
import * as cheerio from 'cheerio';
import { clean, parsePrice } from '../lib/parse.js';

// .../watch-collections/portugieser/iw545901-portugieser-hand-wound-....html
const WATCH_URL = /\/watch-collections\/([^/]+)\/(iw[0-9a-z]+)-[^/]*\.html$/i;

const titleCase = (slug) => slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export function iwcArchive({ market, path, currency }) {
  return {
    id: `iwc-${market.toLowerCase()}`,
    name: 'IWC Schaffhausen',
    type: 'official',
    market,
    prefixes: [`www.iwc.com/${path}/watch-collections/`],
    isProductUrl: (url) => url.startsWith(`https://www.iwc.com/${path}/`) && WATCH_URL.test(url),

    parse(html, url) {
      const [, family, code] = url.match(WATCH_URL) ?? [];
      if (!code) return null;
      const ref = code.toUpperCase();
      const $ = cheerio.load(html);
      // The page also lists related watches: read the element for this one.
      const main = $(`[data-product-reference="${ref}"]`).filter((_, el) => $(el).attr('data-product-price')).first();
      const name = clean(main.attr('data-product-name')) ?? clean($(`[data-product-reference="${ref}"]`).first().attr('data-product-name')) ?? clean($('h1').first().text());
      if (!name) return null;

      const pageCurrency = clean($('[itemprop="priceCurrency"]').first().attr('content'));
      if (pageCurrency && pageCurrency !== currency) {
        throw new Error(`expected ${currency} but the page shows ${pageCurrency}`);
      }
      const images = [];
      $('[itemprop="image"]').each((_, el) => {
        const src = $(el).attr('href') ?? $(el).attr('content') ?? $(el).attr('src');
        if (src && /\.(png|jpe?g|webp)$/i.test(src)) images.push(new URL(src, 'https://www.iwc.com').href);
      });

      return {
        brand: 'iwc',
        ref,
        name,
        category: 'watches',
        collection: titleCase(family),
        description: undefined,
        specs: {},
        images: [...new Set(images)].slice(0, 4).map((src) => ({ url: src, alt: name })),
        url,
        currency,
        price: pageCurrency && main.length ? parsePrice(main.attr('data-product-price')) : null,
        available: null,
      };
    },
  };
}
