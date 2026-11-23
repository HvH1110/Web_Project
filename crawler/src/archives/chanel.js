// Chanel product pages as archived by the Wayback Machine. The live site
// blocks crawlers (SOURCES.md). From 2021 to 2025 the pages have the same
// layout in every market:
// - JSON-LD Product: name, material, colour, sku (the code in the URL) and one
//   picture; an Offer with a price only on some pages, often empty;
// - the price as printed under the name, e.g. "SGD 6,920" or "VND 137 900 000",
//   in p.product-details__price next to the anchor #priceAnchorId-<code>;
// - the gallery: chanel.com/images/... files named after the product and its
//   code, e.g. ...-packshot-default-a92991b0340394305-8826165755934.jpg, each
//   in several sizes;
// - fine jewellery: its characteristics (material, stones) as ImageObjects.
// Codes are the same in every market (AS2431B15875NU928 in SG and HK), so they
// match products across markets. Vietnam's pages are in Vietnamese: their
// details are stored with lang "vi" until an English page shows the product.
import * as cheerio from 'cheerio';
import { categorize } from './common.js';
import { clean } from '../lib/parse.js';

// Divisions in scope, by market language. Not fragrance, beauty, eyewear or
// high jewellery: those pages are never fetched.
const DIVISIONS = {
  en: { fashion: 'fashion', 'fine-jewellery': 'jewelry', watches: 'watches' },
  vi: { 'thoi-trang': 'fashion', 'trang-suc': 'jewelry', 'dong-ho': 'watches' },
};

// Fashion sections, from the path of a breadcrumb link (/sg/fashion/handbags/c/1x1x1/):
// the same in English and Vietnamese where the slug is English.
const FASHION_SECTIONS = [
  [/^(handbags|tui-xach)$/, 'bags'],
  [/^(ready-to-wear|quan-ao)$/, 'clothing'],
  [/^(shoes|giay)$/, 'shoes'],
  [/^(costume-jewellery|trang-suc-thoi-trang|camellias)$/, 'jewelry'],
  [/^(small-leather-goods|vi-va-cac-phu-kien-bang-da-khac|accessories|other-accessories|phu-kien-khac|phu-kien-danh-cho-toc)$/, 'accessories'],
];

// .../p/<code>/<slug>/. "Look" pages (23N_COMMERCIAL_023) have no product code.
const codeOf = (url) => url.match(/\/p\/([0-9a-z]+)\/[^/]*\/?$/i)?.[1].toUpperCase();

// Some pages write a stray comma in their JSON-LD ("sku": "H6672", , "offers").
function parseLd(text) {
  try {
    return JSON.parse(text);
  } catch {
    try {
      return JSON.parse(text.replace(/,(\s*,)+/g, ',').replace(/,\s*([}\]])/g, '$1'));
    } catch {
      return null;
    }
  }
}

function ldBlocks($) {
  const blocks = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    for (const entry of [].concat(parseLd($(el).text()) ?? [])) if (entry && typeof entry === 'object') blocks.push(entry);
  });
  return blocks;
}

// Breadcrumbs as { name, path }, without the home page.
function crumbs(blocks) {
  const list = blocks.find((b) => b['@type'] === 'BreadcrumbList')?.itemListElement ?? [];
  return [].concat(list)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((e) => ({ name: clean(e.item?.name ?? e.name), path: String(e.item?.['@id'] ?? '') }))
    .filter((c) => c.name && !/^global home page$/i.test(c.name));
}

// The section slug after the division: /sg/fashion/handbags/c/1x1x1/ -> handbags.
const sectionOf = (path) => path.split('/').filter(Boolean)[2];
// Chanel's catalogue numbers: 1x1x1 = Fashion > Handbags, 3x2x5 = Fine
// Jewellery > (collections) > Coco Crush, 3x1x2 = Fine Jewellery > (types) > Rings.
const catalogueNumber = (path) => path.match(/\/[cl]\/(\d+(?:x\d+)+)\//)?.[1];

// Category and collection. Fashion: the section crumb, else the crumb names
// (English pages). Jewellery and watches: the crumb in Chanel's "collections"
// branch (n x 2 x ...), e.g. Coco Crush, J12.
function classify(division, list, $, name) {
  if (division === 'fashion') {
    let category;
    for (const c of list) {
      category ??= FASHION_SECTIONS.find(([re]) => re.test(sectionOf(c.path) ?? ''))?.[1];
    }
    category ??= categorize($, name).category;
    // Handbags > Flap Bags: the bag family, when there is one.
    const family = category === 'bags' ? list.find((c) => /^1x1x1x\d+$/.test(catalogueNumber(c.path) ?? '')) : undefined;
    return { category, collection: family?.name };
  }
  // As the page writes it: "Coco Crush", "MONSIEUR", "LES INTEMPORELS DE CHANEL".
  return { category: division, collection: list.find((c) => /^\d+x2x\d+/.test(catalogueNumber(c.path) ?? ''))?.name };
}

// The product's own gallery: one URL per picture (the 1240 px wide one when
// listed), default view first. Pictures of other products have another code.
function galleryImages(html, code) {
  const own = new RegExp(`-${code.toLowerCase()}-\\d+\\.(?:jpe?g|png|webp)$`);
  const byFile = new Map();
  for (const [src] of html.matchAll(/https:\/\/www\.chanel\.com\/images\/[^"'\s<>]*?\.(?:jpe?g|png|webp)/gi)) {
    const file = src.split('/').at(-1);
    if (!own.test(file)) continue;
    const known = byFile.get(file);
    if (!known || (!known.includes('/w_1240/') && src.includes('/w_1240/'))) byFile.set(file, src);
  }
  return [...byFile.entries()]
    .sort(([a], [b]) => Number(/-packshot-default-/.test(b)) - Number(/-packshot-default-/.test(a)))
    .map(([, src]) => src);
}

// "SGD 6,920", "HKD 40,900", "VND 137 900 000": whole amounts. Anything else
// (a decimal part, words) is not read. The block is often there twice (the
// page and its sticky bar), as [{ currency, price }].
function printedPrices($, code) {
  return $(`[id="priceAnchorId-${code}"]`).closest('.product-details__price').toArray().map((el) => {
    const text = clean($(el).clone().children().remove().end().text());
    const m = text?.match(/^([A-Z]{3})\s*(\d{1,3}(?:[ ,.\u00a0\u202f]\d{3})*|\d+)$/);
    return m ? { currency: m[1], price: Number(m[2].replace(/\D/g, '')) } : { currency: undefined, price: null };
  });
}

export function chanelArchive({ market, path, lang = 'en', currency }) {
  const divisions = DIVISIONS[lang];
  const productUrl = new RegExp(`^https://www[.]chanel[.]com/${path}/(${Object.keys(divisions).join('|')})/p/[0-9a-z]+/[^/]*/?$`, 'i');
  return {
    id: `chanel-${market.toLowerCase()}`,
    name: 'Chanel',
    type: 'official',
    market,
    prefixes: Object.keys(divisions).map((d) => `www.chanel.com/${path}/${d}/p/`),
    isProductUrl: (url) => productUrl.test(url) && Boolean(codeOf(url)),
    productKey: (url) => codeOf(url),
    // Pages often show no price (bags in some years): the product is still
    // worth storing, with its price history wherever a page shows one.
    keepWithoutPrice: true,

    parse(html, url) {
      const ref = codeOf(url);
      const division = divisions[url.match(productUrl)?.[1]];
      if (!ref || !division) return null;
      const $ = cheerio.load(html);
      const blocks = ldBlocks($);
      const ld = blocks.find((b) => b['@type'] === 'Product');
      // Only this page's own product.
      if (!ld || (clean(ld.sku) && clean(ld.sku).toUpperCase() !== ref)) return null;
      const title = clean(ld.name);
      if (!title) return null;

      const { category, collection } = classify(division, crumbs(blocks), $, title);
      if (!category) return null;

      const material = clean(ld.material);
      const description = clean(ld.description);
      // "Vest" alone names nothing: Chanel's own titles add material and colour
      // (the description of fashion pages), jewellery its make, watches the case.
      const detail = category === 'watches' ? material : description && description.length <= 80 ? description : material;
      const name = detail && !title.toLowerCase().includes(detail.toLowerCase()) ? `${title}, ${detail}` : title;

      // Fine jewellery lists its make as small icons with a caption:
      // "Material": "18K white gold", "Diamonds": "294 brilliant-cut diamonds ...".
      const specs = {};
      if (material) specs.Material = material;
      if (clean(ld.color)) specs.Colour = clean(ld.color);
      for (const b of blocks) {
        if (b['@type'] !== 'ImageObject' || !String(b.contentUrl ?? '').startsWith('/_ui/')) continue;
        const label = clean(b.name);
        const value = clean(String(b.description ?? '').split('|').join('; '));
        if (label && value) specs[label] = value;
      }

      // The printed price, else a priced Offer. Two different prices: unknown.
      const printed = printedPrices($, ref);
      const offer = [].concat(ld.offers ?? []).find((o) => clean(o?.priceCurrency) && Number(o.price) > 0);
      for (const shown of [...printed.map((p) => p.currency), clean(offer?.priceCurrency)]) {
        if (shown && shown !== currency) throw new Error(`expected ${currency} but the page shows ${shown}`);
      }
      const prices = new Set([...printed.map((p) => p.price), offer ? Number(offer.price) : null].filter((p) => p > 0));

      const images = [...new Set([...galleryImages(html, ref), ...[].concat(ld.image ?? []).filter((src) => typeof src === 'string')])];
      const seen = new Set();
      return {
        brand: 'chanel',
        ref,
        name,
        category,
        collection,
        description,
        specs,
        images: images
          .filter((src) => !seen.has(src.split('/').at(-1)) && seen.add(src.split('/').at(-1)))
          .slice(0, 4)
          .map((src) => ({ url: src, alt: name })),
        url,
        currency,
        price: prices.size === 1 ? [...prices][0] : null,
        available: null,
        ...(lang === 'en' ? {} : { lang }),
      };
    },
  };
}
