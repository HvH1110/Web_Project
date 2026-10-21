// The Hour Glass, Official Rolex Retailer in Singapore. Next.js site: the page
// shows the SGD price ("SGD 15,950"), which is also its JSON-LD offer.
// __NEXT_DATA__ carries prices for The Hour Glass's other countries too (VND,
// AUD, ...); we only take the one the page shows.
import * as cheerio from 'cheerio';
import { clean, jsonLdOfType, parsePrice } from '../lib/parse.js';
import { fetchSitemapUrls } from '../lib/sitemap.js';

const BASE = 'https://www.thehourglass.com/rolex/';
// Watch pages end with the Rolex model code: .../watches/submariner-M126610LN-0001
const WATCH_URL = /\/rolex\/watches\/[a-z0-9-]+-(M[0-9A-Z]+-\d{4})$/;

// "WaterResistance" / "Water Resistance" -> "Water resistance"
const sentenceCase = (label) => {
  const t = label.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export default {
  id: 'thehourglass-sg',
  name: 'The Hour Glass (Official Rolex Retailer)',
  type: 'authorized-dealer',
  market: 'SG',

  async listUrls() {
    const urls = await fetchSitemapUrls(`${BASE}sitemap/rolex.xml`);
    return urls.filter((u) => WATCH_URL.test(u));
  },

  parse(html, url) {
    const $ = cheerio.load(html);
    const ld = jsonLdOfType($, 'Product')[0];
    const ref = clean(ld?.sku) ?? url.match(WATCH_URL)?.[1];
    if (!ld || !ref) return null;
    const offer = [].concat(ld.offers ?? [])[0];
    if (offer?.priceCurrency && offer.priceCurrency !== 'SGD') {
      throw new Error(`expected SGD but the page shows ${offer.priceCurrency}`);
    }

    // Full spec list from the page state; the JSON-LD has a shorter one.
    let details;
    try {
      details = JSON.parse($('#__NEXT_DATA__').text()).props.pageProps.redux.initialState.page.productDetails;
    } catch {
      details = undefined;
    }
    const specs = {};
    for (const [key, value] of Object.entries(details ?? {})) {
      if (key.startsWith('Spec_') && clean(value)) specs[sentenceCase(key.slice(5))] = clean(value);
    }
    if (!Object.keys(specs).length) {
      for (const p of ld.additionalProperty ?? []) {
        // "Model Availability" is the retailer's boilerplate about waiting lists.
        if (clean(p.value) && !/availability/i.test(p.name)) specs[sentenceCase(clean(p.name))] = clean(p.value);
      }
    }

    // The upright watch shot, then the gallery slides (landscape renditions).
    // e.g. https://cdn.thehourglass.com/2026/upright_watch_assets_landscape/m126610ln-0001.webp
    const picture = new RegExp(
      `https://cdn\\.thehourglass\\.com/[\\w/]*?(?:upright_watch_assets_landscape|model_gallery_assets_landscape/Slide\\d_landscape)/${ref.toLowerCase()}\\.(?:webp|jpe?g|png)`,
      'g',
    );
    const pictures = new Set(html.match(picture));
    const family = clean(ld.name);
    const modelCase = specs['Model case'];
    const name = [family, modelCase].filter(Boolean).join(', ');
    const images = [...pictures]
      .sort((a, b) => Number(b.includes('upright')) - Number(a.includes('upright')))
      .slice(0, 4)
      .map((src) => ({ url: src, alt: name }));

    return {
      brand: 'rolex',
      ref,
      name,
      category: 'watches',
      // Same as DAFC, which names the collection after the model family.
      collection: family,
      // The JSON-LD description is a template ("at {{retailer}} {{COUNTRY_SHORT}}").
      description: undefined,
      specs,
      images,
      url,
      currency: 'SGD',
      // "Price on request" pages have no offer.
      price: parsePrice(offer?.price),
      available: null,
    };
  },
};
