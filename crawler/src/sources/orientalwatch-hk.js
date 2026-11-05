// Oriental Watch Company, Official Rolex Retailer in Hong Kong. Each model page
// has JSON-LD with its HKD price ("Suggested retail price inclusive of V.A.T.").
// The site shows about 110 models, fewer than DAFC or The Hour Glass.
import * as cheerio from 'cheerio';
import { clean, jsonLdOfType, labelCase, parsePrice } from '../lib/parse.js';
import { fetchSitemapUrls } from '../lib/sitemap.js';

const SITE = 'https://www.orientalwatch.com';
// English pages only. .../en/rolex/submariner-date/m126610ln-0001/ or
// .../en/rolex/accessories/a1018/. The certified pre-owned section is left out:
// its prices are not list prices.
const MODEL_URL = /\/en\/rolex\/([a-z0-9-]+)\/(m\d{5,6}[0-9a-z]*-\d{4}|a\d{4}|c\d{5,}[0-9a-z]*-\d{4})\/?$/;

export default {
  id: 'orientalwatch-hk',
  name: 'Oriental Watch (Official Rolex Retailer)',
  type: 'authorized-dealer',
  market: 'HK',

  async listUrls() {
    const urls = await fetchSitemapUrls(`${SITE}/sitemap.xml`);
    return urls.filter((u) => MODEL_URL.test(u));
  },

  parse(html, url) {
    const [, family, code] = url.match(MODEL_URL) ?? [];
    if (!code) return null;
    const $ = cheerio.load(html);
    const ld = jsonLdOfType($, 'Product')[0];
    if (!ld) return null;
    const offer = [].concat(ld.offers ?? [])[0];
    if (offer?.priceCurrency && offer.priceCurrency !== 'HKD') {
      throw new Error(`expected HKD but the page shows ${offer.priceCurrency}`);
    }

    // <div class="rolex-Spec-title">Bezel<div class="Rolex_CTA3-thin">Fluted</div></div>
    const specs = {};
    $('.rolex-Spec-title').each((_, el) => {
      const value = clean($(el).find('.Rolex_CTA3-thin').first().text());
      const label = clean($(el).clone().children().remove().end().text());
      if (label && value && !['Reference', 'RMC'].includes(label)) specs[labelCase(label)] = value;
    });

    // The upright watch shot, then the gallery slides, in landscape. An accessory
    // has its own pictures with the code in the file name.
    const isAccessory = family === 'accessories';
    const picture = new RegExp(`${SITE}/images/rolex/[^"'\\s,]*${code}[^"'\\s,/]*\\.(?:webp|jpe?g|png)`, 'gi');
    const pictures = [...new Set(html.match(picture) ?? [])].filter((src) => !/portrait|mobile|feature/i.test(src));
    const rank = (src) => (src.includes('upright') ? 0 : /Slide\d/i.test(src) ? 1 : 2);
    // Accessories have no name in the JSON-LD: "‘Crown’ cufflinks, Yellow gold".
    const name = isAccessory
      ? [specs.Model, specs.Material].filter(Boolean).join(', ') || clean($('h1').first().text())
      : [clean(ld.name), clean(ld.description)].filter(Boolean).join(', ');
    const images = pictures.sort((a, b) => rank(a) - rank(b)).slice(0, 4).map((src) => ({ url: src, alt: name }));

    return {
      brand: 'rolex',
      ref: code.toUpperCase(),
      name,
      category: isAccessory ? 'accessories' : 'watches',
      collection: isAccessory ? undefined : clean(ld.name),
      description: isAccessory ? clean(ld.description) : undefined,
      specs,
      images,
      url,
      currency: 'HKD',
      price: parsePrice(offer?.price),
      // Not shown on the page.
      available: null,
    };
  },
};
