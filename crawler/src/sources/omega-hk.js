// Omega's official Hong Kong store. No product sitemap: product pages come from
// the site's public catalog API (Magento GraphQL, the same one its own pages
// call, no login). Each page has JSON-LD with its HKD offer, plus offers for
// related watches under `addOn`, which are not this product's price.
import * as cheerio from 'cheerio';
import { politeFetch } from '../lib/http.js';
import { clean, jsonLdOfType, ldAvailability, parsePrice } from '../lib/parse.js';

const SITE = 'https://www.omegawatches.com.hk';
const BASE = `${SITE}/en-hk/`;
const WATCHES_CATEGORY = 'NA=='; // "Watches", from categoryList
const PAGE_SIZE = 50;
// .../watch-omega-seamaster-diver-300m-...-42-mm-21030422003001
const WATCH_URL = /\/en-hk\/watch-[a-z0-9-]+-(\d{14})$/;

async function catalogPage(page) {
  const query = `{ products(filter: { category_uid: { eq: "${WATCHES_CATEGORY}" } }, pageSize: ${PAGE_SIZE}, currentPage: ${page}) { page_info { total_pages } items { url_key } } }`;
  const res = await politeFetch(`${SITE}/graphql?query=${encodeURIComponent(query)}`, {
    headers: { Store: 'hk_en', Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`catalog API answered HTTP ${res.status}`);
  const { data, errors } = await res.json();
  if (!data?.products) throw new Error(`catalog API: ${errors?.[0]?.message ?? 'no products in the answer'}`);
  return data.products;
}

export default {
  id: 'omega-hk',
  name: 'Omega Hong Kong',
  type: 'official',
  market: 'HK',

  async listUrls() {
    const urls = [];
    let totalPages = 1;
    for (let page = 1; page <= totalPages; page += 1) {
      const { page_info: info, items } = await catalogPage(page);
      totalPages = info.total_pages;
      for (const { url_key: key } of items) urls.push(`${BASE}${key}`);
    }
    return [...new Set(urls)].filter((u) => WATCH_URL.test(u));
  },

  parse(html, url) {
    const code = url.match(WATCH_URL)?.[1];
    if (!code) return null;
    const $ = cheerio.load(html);
    const ld = jsonLdOfType($, 'Product')[0];
    const offer = [].concat(ld?.offers ?? [])[0];
    if (!ld || !offer) return null;

    const specs = {};
    let ref;
    $('dt').each((_, el) => {
      const value = clean($(el).next('dd').text());
      // Some labels also hold a hidden "Open Case Measurement Modal" button.
      const label = clean($(el).text())?.replace(/\s*Open .* Modal$/, '');
      if (!label || !value) return;
      if (label === 'Reference') ref = value;
      else specs[label] = value;
    });
    // The JSON-LD sku is the dotted reference too: both must name this watch.
    if (!ref || clean(offer.sku) !== ref) return null;
    if (ref.replace(/\D/g, '') !== code) return null;
    if (offer.priceCurrency && offer.priceCurrency !== 'HKD') {
      throw new Error(`expected HKD but the page shows ${offer.priceCurrency}`);
    }

    // <h1>: a "New" tag (not part of the name), "Seamaster Diver 300M", "42 mm, steel on steel".
    const title = $('h1').first().clone();
    title.find('.pp-gallery__tags').remove();
    const name = clean(title.text());
    title.find('.name').remove();
    const collection = clean(title.text());

    // Main shot, then wrist and portrait shots, in page order. Other watches'
    // pictures on the page have another code in the file name.
    const picture = new RegExp(`${SITE}/media/catalog/product/[^"'\\s\\\\?&]+-${code}(?:-[a-z0-9-]+)?\\.(?:png|jpg|webp)`, 'g');
    const images = [...new Set(html.match(picture) ?? [])];

    return {
      brand: 'omega',
      ref,
      name,
      category: 'watches',
      collection,
      description: clean($('.technical-data-value').filter((_, el) => $(el).is('div')).map((_, el) => $(el).text()).get().find((t) => clean(t))),
      specs,
      images: images.slice(0, 4).map((src) => ({ url: src, alt: name })),
      url,
      currency: 'HKD',
      price: parsePrice(offer.price),
      // A watch out of stock has no availability in its offer, only this text.
      available: ldAvailability(offer.availability) ?? (/currently unavailable online/i.test(html) ? false : null),
    };
  },
};
