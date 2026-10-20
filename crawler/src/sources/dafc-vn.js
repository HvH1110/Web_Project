// DAFC, Official Rolex Retailer in Vietnam (Hanoi and Ho Chi Minh City).
// WordPress + WooCommerce. Prices are "suggested retail price inclusive of VAT".
import * as cheerio from 'cheerio';
import { clean, jsonLdOfType, labelCase, parsePrice } from '../lib/parse.js';
import { fetchSitemapUrls } from '../lib/sitemap.js';

const BASE = 'https://rolex.dafc.com.vn/rolex/';

export default {
  id: 'dafc-vn',
  name: 'DAFC (Official Rolex Retailer)',
  type: 'authorized-dealer',
  market: 'VN',

  async listUrls() {
    const urls = await fetchSitemapUrls(`${BASE}product-sitemap.xml`);
    // English pages only: /rolex/vi/ has the same watches in Vietnamese.
    return urls.filter((u) => u.startsWith(BASE) && !u.startsWith(`${BASE}vi/`));
  },

  parse(html, url) {
    const $ = cheerio.load(html);
    const ld = jsonLdOfType($, 'Product')[0];
    // Rolex model code (RMC), e.g. M126610LN-0001: the ref used across markets.
    // Accessory pages write it as "RMC A1015".
    const ref = clean($('.p-rmc').first().text())?.replace(/^RMC\s+/i, '') ?? clean(ld?.sku);
    if (!ref) return null;
    const isAccessory = new URL(url).pathname.includes('/accessories/');
    const family = clean($('.p-name').first().text()) ?? clean(ld?.category);
    const modelCase = clean($('.p-modelcase').first().text());
    const offer = [].concat(ld?.offers ?? [])[0];

    // The spec list appears twice (desktop and mobile layouts); read the first.
    const specs = {};
    $('.sec_model-specs').first().find('.elementor-widget-container').each((_, el) => {
      const label = clean($(el).find('strong').first().text());
      const value = clean($(el).clone().find('strong').remove().end().text());
      if (label && value) specs[labelCase(label)] = value;
    });

    // Watches: the watch shot plus gallery slides, desktop rendition when there
    // is one. Accessories: a packshot plus desktop backgrounds
    // (.../rolex-accessories-a1015-packshot.webp).
    const pictures = new Map();
    $('img[src*="/uploads/model/"]').each((_, el) => {
      const src = $(el).attr('src');
      const alt = clean($(el).attr('alt'));
      const watch = src.match(/\/model\/(watch|gallery)\/(desktop|mobile)\/(?:(slide\d+)\/)?([^/]+)\.\w+$/);
      if (watch && watch[4].toUpperCase() === ref.toUpperCase()) {
        const key = `${watch[1]}-${watch[3] ?? ''}`;
        if (!pictures.has(key) || watch[2] === 'desktop') pictures.set(key, { url: src, alt });
        return;
      }
      const accessory = src.match(/\/model\/accessories\/.*\/rolex-accessories-(.+)-[a-z]+\.\w+$/i);
      if (accessory && accessory[1].toUpperCase() === ref.toUpperCase() && !/\/mobile\//.test(src)) {
        pictures.set(src, { url: src, alt });
      }
    });
    const images = [...pictures.values()].slice(0, 4);

    return {
      brand: 'rolex',
      ref,
      name: [family, modelCase].filter(Boolean).join(', '),
      category: isAccessory ? 'accessories' : 'watches',
      collection: isAccessory ? undefined : family,
      // The page has no model-specific text besides the main picture's caption.
      description: images[0]?.alt,
      specs,
      images,
      url,
      currency: offer?.priceCurrency ?? 'VND',
      price: parsePrice(offer?.price),
      // Not shown on the page (the JSON-LD says InStock for every model).
      available: null,
    };
  },
};
