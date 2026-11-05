// Van Cleef & Arpels product pages as archived by the Wayback Machine. The live
// site blocks crawlers (SOURCES.md). Pages carry JSON-LD Product + Offer, e.g.
// VCARA29600, HKD 68,500 (Jun 2021). The page fills in its own price with a
// script, so the Offer is the only place it appears in the HTML; the same Offers
// match the prices printed for related products further down the page.
import * as cheerio from 'cheerio';
import { clean, parsePrice } from '../lib/parse.js';
import { ldImages } from './common.js';

// .../collections/jewelry/flora/lotus/vcaro6p800---lotus-clip-pendant-medium-model.html
const PRODUCT_URL = /\/collections\/((?:jewelry|engagement|high-jewelry|watches)(?:\/[^/]+)*)\/(vcar[0-9a-z]+)-[^/]*\.html$/i;

const titleCase = (slug) => slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
// Folders that lose an accent in the URL.
const COLLECTION_NAMES = { perlee: 'Perlée', 'a-cheval': 'À Cheval', 'fleurs-d-hawai': 'Fleurs d’Hawaï' };

// Every Product in the page's JSON-LD. Pages also list related products, and
// some from 2025 write "type" instead of "@type".
function ldProducts($) {
  const products = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      for (const entry of [].concat(JSON.parse($(el).text()))) {
        if ((entry?.['@type'] ?? entry?.type) === 'Product') products.push(entry);
      }
    } catch {
      // A broken block says nothing about the product: skip it.
    }
  });
  return products;
}

export function vanCleefArchive({ market, path, currency }) {
  return {
    id: `vancleefarpels-${market.toLowerCase()}`,
    name: 'Van Cleef & Arpels',
    type: 'official',
    market,
    prefixes: [`www.vancleefarpels.com/${path}/collections/`],
    // Not fragrances: out of scope, so those pages are never fetched.
    isProductUrl: (url) => url.startsWith(`https://www.vancleefarpels.com/${path}/`) && PRODUCT_URL.test(url),

    parse(html, url) {
      const [, folders, code] = url.match(PRODUCT_URL) ?? [];
      if (!code) return null;
      const ref = code.toUpperCase();
      // Only this page's own product: its sku is the code in the URL.
      const $ = cheerio.load(html);
      const own = ldProducts($).filter((p) => clean(p.sku)?.toUpperCase() === ref);
      const title = clean(own[0]?.name);
      if (!title) return null;
      // Printed under the title: "18K yellow gold, Onyx". Variants share a title
      // ("Vintage Alhambra earrings") and differ only by this, so it goes in the name.
      const material = clean($('.vca-pdp-material').first().text());
      const name = material ? `${title}, ${material}` : title;

      const offers = own.flatMap((p) => [].concat(p.offers ?? []));
      for (const offer of offers) {
        if (offer?.priceCurrency && offer.priceCurrency !== currency) {
          throw new Error(`expected ${currency} but the page shows ${offer.priceCurrency}`);
        }
      }
      // A page that repeats its product with two prices doesn't say which is right.
      const prices = new Set(offers.filter((o) => o?.priceCurrency).map((o) => parsePrice(o.price) || null));
      const folder = folders.split('/').at(-1);

      return {
        brand: 'van-cleef-arpels',
        ref,
        name,
        category: folders.startsWith('watches') ? 'watches' : 'jewelry',
        collection: COLLECTION_NAMES[folder] ?? titleCase(folder),
        description: clean(own[0].description),
        specs: material ? { Material: material } : {},
        images: [...new Set(own.flatMap((p) => ldImages(p.image)))].slice(0, 4).map((src) => ({ url: src, alt: name })),
        url,
        currency,
        price: prices.size === 1 ? [...prices][0] : null,
        available: null,
      };
    },
  };
}
