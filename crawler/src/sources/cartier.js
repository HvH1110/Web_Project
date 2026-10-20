// Shared adapter for cartier.com. One source per market: cartier-vn, -sg, -hk.
// Product pages carry the price in JSON-LD and the product data in data-*
// attributes of the `.car-pdp` container; plain HTTP is enough.
import * as cheerio from 'cheerio';
import { config } from '../config.js';
import { clean, jsonLdOfType, labelCase, parsePrice } from '../lib/parse.js';
import { fetchSitemapUrls } from '../lib/sitemap.js';

// Sections we track, by URL path after the locale. Fragrances, eyewear,
// pens and home items are left out.
const SCOPE = [
  [/^\/jewellery\//, 'jewelry'],
  [/^\/watches\//, 'watches'],
  [/^\/bags-and-accessories\/bags\//, 'bags'],
  [/^\/bags-and-accessories\/small-leather-goods\//, 'accessories'],
];

// Product URLs end with the site's product code, e.g. ...-CRWSSA0083.
const PRODUCT_CODE = /-(CR[A-Z0-9]+)$/;

// FNV-1a: a small stable hash, so a product's rotation day never changes.
function hash(text) {
  let h = 0x811c9dc5;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
  return h;
}

export function cartierSource({ market, locale, currency }) {
  const base = `https://www.cartier.com/${locale}/`;
  const categoryOf = (url) => {
    const path = new URL(url).pathname.slice(locale.length + 1);
    return SCOPE.find(([re]) => re.test(path))?.[1];
  };

  return {
    id: `cartier-${market.toLowerCase()}`,
    name: 'Cartier',
    type: 'official',
    market,

    async listUrls() {
      const urls = await fetchSitemapUrls(`https://www.cartier.com/${locale}.sitemap.xml`);
      const seen = new Set();
      return urls.filter((url) => {
        const code = url.match(PRODUCT_CODE)?.[1];
        if (!code || !url.startsWith(base) || !categoryOf(url) || seen.has(code)) return false;
        seen.add(code);
        return true;
      });
    },

    // About 1,700 products per market, all on one host: at one request every
    // few seconds a full pass takes hours. So each run crawls one day's slice
    // and every product comes round once every CARTIER_ROTATION_DAYS days. The
    // slice depends only on the product code, so all markets check the same
    // products on the same day.
    select(urls, now = new Date()) {
      const days = config.cartierRotationDays;
      const today = Math.floor(now.getTime() / 86_400_000) % days;
      return urls.filter((url) => hash(url.match(PRODUCT_CODE)[1]) % days === today);
    },

    parse(html, url) {
      const category = categoryOf(url);
      const $ = cheerio.load(html);
      const pdp = $('.car-pdp').first();
      if (!category || !pdp.length) return null;
      const data = (name) => clean(pdp.attr(`data-${name}`));

      const ld = jsonLdOfType($, 'Product')[0];
      const offer = [].concat(ld?.offers ?? [])[0];
      // Cartier's own reference (shown as "Ref. WSSA0083"); the site adds "CR" in URLs.
      const ref = clean(ld?.sku) ?? data('item-id') ?? data('item-reference')?.replace(/^CR/, '');
      if (!ref) return null;

      const pageCurrency = offer?.priceCurrency ?? data('currency');
      if (pageCurrency && pageCurrency !== currency) {
        throw new Error(`expected ${currency} but the page shows ${pageCurrency}`);
      }

      // Watches: a SPECIFICATIONS block of label/value pairs.
      const specs = {};
      $('.car__product-specification__item').each((_, el) => {
        const label = labelCase($(el).find('.car__product-specification__item-label').text());
        const value = clean($(el).find('.car__product-specification__item-content').text());
        if (label && value && !(label in specs)) specs[label] = value;
      });
      // Jewellery: "• Key: value" lines in the description.
      const raw = $('meta[property="og:description"]').attr('content') ?? ld?.description ?? '';
      const lines = raw
        .split(/<br\s*\/?>|\n/i)
        .map((line) => clean(line.replace(/^\s*•\s*/, '')))
        .filter((line) => line && !/^Product description:?$/i.test(line));
      for (const line of lines) {
        const m = line.match(/^([A-Za-z][\w\s-]{1,40}):\s*(.+)$/);
        if (m && !(labelCase(m[1]) in specs)) specs[labelCase(m[1])] = m[2];
      }
      if (data('item-material') && !specs.Material) specs.Material = data('item-material');

      const name = data('item-name') ?? clean($('h1').first().text());
      const pictures = new Set();
      // Images are lazy-loaded: the real URLs sit in data-srcset / data-src.
      $('.car-pdp__image-cards').first().find('source, img').each((_, el) => {
        for (const attr of ['data-srcset', 'srcset', 'data-src', 'src']) {
          const m = ($(el).attr(attr) ?? '').match(/\/dam\/\S+?\.(?:jpe?g|png)(?=\.transform)/);
          if (m) pictures.add(m[0]);
        }
      });
      if (!pictures.size) {
        const og = $('meta[property="og:image"]').attr('content')?.match(/\/dam\/\S+?\.(?:jpe?g|png)(?=\.transform)/);
        if (og) pictures.add(og[0]);
      }
      const images = [...pictures]
        .slice(0, 4)
        .map((path) => ({ url: `https://www.cartier.com${path}.transform.carprodcard.png`, alt: name }));

      // Stock is only meaningful where Cartier sells online (not in Vietnam).
      const ecommerce = html.match(/"market_ecom"\s*:\s*"(\w+)"/)?.[1] === 'Yes';
      const stock = data('item-stock');

      return {
        brand: 'cartier',
        ref,
        name,
        category,
        collection: data('item-collection'),
        description: lines.join('\n') || undefined,
        specs,
        images,
        url,
        currency,
        price: parsePrice(offer?.price),
        available: ecommerce && stock ? stock === 'instock' : null,
      };
    },
  };
}
