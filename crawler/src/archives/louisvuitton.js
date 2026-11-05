// Louis Vuitton product pages as archived by the Wayback Machine. The live
// site blocks crawlers (SOURCES.md). Since late 2024 archived pages carry
// JSON-LD Product + Offer, e.g. Capucines MM Souple, M12929, SGD 11000 (Dec
// 2025). Older ones (back to 2015) have no JSON-LD product: see parseOlderPage.
// Singapore was at ap.louisvuitton.com/eng-sg/ until about 2024.
import * as cheerio from 'cheerio';
import { categorize, parseJsonLdProduct } from './common.js';
import { clean, parsePrice } from '../lib/parse.js';

const REF = /^[0-9A-Z]{6}$/;
const CURRENCY_SIGN = { SGD: 'S$', HKD: 'HK$' };

// The code in one of its older places: DEFAULT_SKU = 'M41428' (2015 to 2018),
// <meta name="page_name" content="productsheet/M80898"> (2019 on).
function olderRef($, html) {
  const ref =
    html.match(/DEFAULT_SKU\s*=\s*'([^']+)'/)?.[1] ??
    $('meta[name="page_name"]').attr('content')?.match(/^productsheet\/(.+)$/)?.[1] ??
    clean($('.sku').first().text());
  return ref && REF.test(ref) ? ref : undefined;
}

// The product's own price element: other products' prices on the page use other
// classes. Null when it shows none. A price in another currency is an error,
// like the JSON-LD check: never store it as this market's price.
function olderPrice($, currency) {
  const text = clean($('.priceValue, .lv-product-purchase__price, .lv-product__price').first().text());
  if (!text || !/\d/.test(text)) return null;
  if (!text.startsWith(CURRENCY_SIGN[currency])) {
    throw new Error(`expected ${currency} but the page shows "${text}"`);
  }
  return parsePrice(text.slice(CURRENCY_SIGN[currency].length));
}

// og:image is the main shot, .../PP_VP_L/louis-vuitton--M50421_PM2_Front view.jpg.
// Its code (not always the ref) picks this product's other views out of the page.
function olderImages($, html) {
  const main = $('meta[property="og:image"]').attr('content');
  const code = main?.match(/--([0-9A-Za-z]+)_PM\d/)?.[1];
  if (!code) return [];
  const host = new URL(main).host;
  const views = new Map();
  const add = (path) => {
    const view = path.match(new RegExp(`--${code}_(PM\\d_[^.]+)\\.`))?.[1].replace(/%20/g, ' ');
    if (view && !views.has(view)) views.set(view, `https://${host}${path.replace(/ /g, '%20')}`);
  };
  add(new URL(main).pathname);
  const shots = new RegExp(`/images/is/image/lv/1/PP_VP_L/[^"'?,]*--${code}_PM\\d_[^"'?,.]+\\.(?:jpg|png)`, 'g');
  for (const path of html.match(shots) ?? []) add(path);
  return [...views.values()];
}

// Older og:description: "Discover Louis Vuitton Lockme Pouch: The Lockme pouch..."
// or " Keepall 45 Travel light, ...". Keeps only the sentence after the name.
function olderDescription($, name) {
  const text = clean($('meta[property="og:description"]').attr('content'));
  if (!text) return undefined;
  const body = text.replace(/^Discover Louis Vuitton [^:]*:\s*/, '');
  return clean(body.startsWith(`${name} `) ? body.slice(name.length) : body);
}

function parseOlderPage($, html, url, currency) {
  const ref = olderRef($, html);
  const name = clean($('h1').first().text());
  if (!ref || !name) return null;
  const { category, collection } = categorize($, name);
  if (!category) return null;
  const images = olderImages($, html);
  return {
    brand: 'louis-vuitton',
    ref,
    name,
    category,
    collection,
    description: olderDescription($, name),
    specs: {},
    images: images.slice(0, 4).map((src) => ({ url: src, alt: name })),
    url,
    currency,
    price: olderPrice($, currency),
    available: null,
  };
}

export function louisVuittonArchive({ market, hosts, locale, currency }) {
  const pages = new RegExp(`^https://(${hosts.join('|').replace(/\./g, '[.]')})/${locale}/products/[^/]+`);
  return {
    id: `louisvuitton-${market.toLowerCase()}`,
    name: 'Louis Vuitton',
    type: 'official',
    market,
    // The only archive with readable prices before 2020 (SOURCES.md).
    firstYear: 2015,
    prefixes: hosts.map((host) => `${host}/${locale}/products/`),
    isProductUrl: (url) => pages.test(url),
    parse(html, url) {
      const $ = cheerio.load(html);
      const item = parseJsonLdProduct($, url, { brand: 'louis-vuitton', currency });
      if (!item) return parseOlderPage($, html, url, currency);
      // Runway "look" pages have JSON-LD with a page id as sku: not a product.
      if (!REF.test(item.ref)) return null;
      // 2019 to 2020: JSON-LD with few pictures, and sometimes an offer with no price.
      item.price ??= olderPrice($, currency);
      const images = olderImages($, html);
      if (images.length >= item.images.length) {
        item.images = images.slice(0, 4).map((src) => ({ url: src, alt: item.name }));
      }
      return item;
    },
  };
}
