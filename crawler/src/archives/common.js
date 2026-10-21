// Helpers shared by the archive (Wayback) adapters.
import { clean, jsonLdOfType, parsePrice } from '../lib/parse.js';

// Category words in breadcrumbs, most specific first. null = out of scope
// (fragrance, beauty, home, ...): the snapshot is skipped.
// ("Home page" crumbs are not the home category: that is "Art of Living" at
// Louis Vuitton and "Maison" at Dior.)
const CATEGORY_WORDS = [
  [/perfume|fragrance|parfum|beauty|make-?up|skincare|art of living|\bmaison\b|home ?(decor|ware)|books?\b|stationery|gift/i, null],
  [/watch/i, 'watches'],
  [/jewel|\brings?\b|necklace|earring|bracelet|pendant/i, 'jewelry'],
  [/shoe|sneaker|boot|loafer|sandal|pump|mule|espadrille|slide/i, 'shoes'],
  [/small leather|wallet|card holder|key holder|belt|scar(f|ves)|shawl|stole|sunglass|eyewear|\bhats?\b|\bcaps?\b|glove|\bties?\b|charm|accessor/i, 'accessories'],
  [/bag|luggage|travel|backpack|tote|clutch|pouch|trunk/i, 'bags'],
  [/ready-to-wear|pr[êe]t-[àa]-porter|clothing|shirt|jacket|coat|dress|knit|trousers|pants|shorts|skirt|sweater|hoodie|blouse|cardigan|polo|swim|denim|jeans/i, 'clothing'],
];

const categoryOf = (text) => CATEGORY_WORDS.find(([re]) => re.test(text))?.[1];

// Breadcrumb names from JSON-LD, without the product itself (the last crumb).
export function breadcrumbs($) {
  const list = jsonLdOfType($, 'BreadcrumbList')[0]?.itemListElement ?? [];
  const names = [].concat(list)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((e) => clean(e.item?.name ?? e.name))
    .filter(Boolean);
  return names.slice(0, -1);
}

// Category from the deepest breadcrumb that names one, plus the crumb after
// it (e.g. "Lady Dior" after "Bags") as the collection. Without one: the
// category in the page title ("Name - Ready-to-Wear | LOUIS VUITTON"), then
// the product name ("Clair D Lune Earrings").
// category is undefined when nothing matched, null when out of scope.
export function categorize($, name) {
  const crumbs = breadcrumbs($);
  for (let i = crumbs.length - 1; i >= 0; i -= 1) {
    const category = categoryOf(crumbs[i].replace(/fashion\s*&\s*accessories/i, ''));
    if (category !== undefined) return { category, collection: i < crumbs.length - 1 ? crumbs.at(-1) : undefined };
  }
  const titleParts = $('title').first().text().split('|')[0].split(' - ');
  const titleCategory = titleParts.length > 1 ? titleParts.at(-1) : undefined;
  for (const text of [titleCategory, name]) {
    const category = text && categoryOf(text);
    if (category !== undefined) return { category };
  }
  return { category: undefined };
}

// Image URLs from JSON-LD `image` (a string, strings or ImageObjects).
export function ldImages(image) {
  return [].concat(image ?? [])
    .map((img) => (typeof img === 'string' ? img : img?.url ?? img?.contentUrl))
    .filter((src) => typeof src === 'string' && /^https?:\/\//.test(src));
}

// Product pages with schema.org JSON-LD (Product + Offer + BreadcrumbList), as
// archived. Returns the normalized item, or null when the snapshot has no
// product data or the product is out of scope. Only the price in the Offer
// counts: analytics data in the page is not what the page showed.
export function parseJsonLdProduct($, url, { brand, currency }) {
  const ld = jsonLdOfType($, 'Product')[0];
  const ref = clean(ld?.sku);
  const name = clean(ld?.name);
  if (!ref || !name) return null;

  const { category, collection } = categorize($, name);
  if (!category) return null;

  const offer = [].concat(ld.offers ?? [])[0];
  if (offer?.priceCurrency && offer.priceCurrency !== currency) {
    throw new Error(`expected ${currency} but the page shows ${offer.priceCurrency}`);
  }
  // og:image is often the first picture again, on another host.
  const byPath = new Map();
  for (const src of [...ldImages(ld.image), ...ldImages($('meta[property="og:image"]').attr('content'))]) {
    const path = new URL(src).pathname;
    if (!byPath.has(path)) byPath.set(path, src);
  }
  const images = [...byPath.values()];

  return {
    brand,
    ref,
    name,
    category,
    collection,
    description: clean(ld.description),
    specs: {},
    images: images.slice(0, 4).map((src) => ({ url: src, alt: name })),
    url,
    currency,
    price: offer?.priceCurrency ? parsePrice(offer.price) : null,
    available: null,
  };
}
