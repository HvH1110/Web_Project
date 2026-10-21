import { Offer, PricePoint, Product } from '../models/index.js';
import { BRANDS, CATEGORIES, CURRENCIES, MARKETS } from '../models/constants.js';

// DATA.md: reference codes are uppercase with no spaces.
export function normalizeRef(ref) {
  return String(ref).toUpperCase().replace(/\s+/g, '');
}

export function validateItem(source, item) {
  const problems = [];
  if (!BRANDS.includes(item.brand)) problems.push(`brand "${item.brand}"`);
  if (!item.ref) problems.push('missing ref');
  if (!item.name) problems.push('missing name');
  if (!CATEGORIES.includes(item.category)) problems.push(`category "${item.category}"`);
  if (!item.url) problems.push('missing url');
  if (!CURRENCIES.includes(item.currency)) problems.push(`currency "${item.currency}"`);
  if (!MARKETS.includes(source.market)) problems.push(`market "${source.market}"`);
  if (item.price != null && !(item.price > 0)) problems.push(`price "${item.price}"`);
  if (problems.length) throw new Error(`invalid item ${item.url ?? ''}: ${problems.join(', ')}`);
}

// Writes one scraped product page. Safe to re-run:
// - products: upsert by { brand, ref }. The first source to see a product sets
//   its details; later sources only fill fields that are still empty.
// - offers: upsert by { productId, source.id }.
// - price_points: a new point only when the price (or currency) differs from
//   the last point of this source.
export async function saveItem(source, item, observedAt = new Date()) {
  validateItem(source, item);
  const { product, created } = await upsertProduct(source, item);

  await Offer.updateOne(
    { productId: product._id, 'source.id': source.id },
    {
      $set: {
        source: { id: source.id, name: source.name, type: source.type, market: source.market },
        url: item.url,
        currency: item.currency,
        price: item.price ?? null,
        available: item.available ?? null,
        lastSeenAt: observedAt,
      },
    },
    { upsert: true },
  );

  let priceChanged = false;
  if (item.price != null) {
    const last = await PricePoint.findOne({ productId: product._id, sourceId: source.id })
      .sort({ observedAt: -1 })
      .lean();
    if (!last || last.price !== item.price || last.currency !== item.currency) {
      await PricePoint.create({
        productId: product._id,
        sourceId: source.id,
        market: source.market,
        currency: item.currency,
        price: item.price,
        observedAt,
        origin: 'crawl',
      });
      priceChanged = true;
    }
  }
  return { created, priceChanged };
}

// Writes the price an archived (Wayback) snapshot of a source's page showed.
// No offer: an old snapshot is history, not a current price. Snapshots come in
// any date order, so a point is added only when it differs from the point just
// before it, and a later archived point that now repeats it is removed.
export async function saveArchivedItem(source, item, observedAt, archiveUrl) {
  validateItem(source, item);
  if (item.price == null) throw new Error('saveArchivedItem needs a price');
  const { product, created } = await upsertProduct(source, item);
  const key = { productId: product._id, sourceId: source.id };
  const same = (p) => p && p.price === item.price && p.currency === item.currency;

  const before = await PricePoint.findOne({ ...key, observedAt: { $lte: observedAt } })
    .sort({ observedAt: -1 })
    .lean();
  if (same(before)) return { created, priceChanged: false };
  await PricePoint.create({
    ...key,
    market: source.market,
    currency: item.currency,
    price: item.price,
    observedAt,
    origin: 'wayback',
    archiveUrl,
  });
  const after = await PricePoint.findOne({ ...key, observedAt: { $gt: observedAt } })
    .sort({ observedAt: 1 })
    .lean();
  if (same(after) && after.origin === 'wayback') await PricePoint.deleteOne({ _id: after._id });
  return { created, priceChanged: true };
}

// products: upsert by { brand, ref }. The first source to see a product sets
// its details; later sources only fill fields that are still empty.
async function upsertProduct(source, item) {
  const ref = normalizeRef(item.ref);
  const images = (item.images ?? []).slice(0, 4).map((img) => ({ ...img, sourceId: source.id }));
  const details = {
    name: item.name,
    category: item.category,
    collection: item.collection,
    description: item.description,
    specs: item.specs ?? {},
    images,
  };

  // $setOnInsert never touches an existing product, so `value` is also the
  // product as it was before this call.
  const result = await Product.findOneAndUpdate(
    { brand: item.brand, ref },
    { $setOnInsert: { brand: item.brand, ref, ...details } },
    { upsert: true, returnDocument: 'after', lean: true, includeResultMetadata: true },
  );
  const product = result.value;
  const created = !result.lastErrorObject?.updatedExisting;

  if (!created) {
    const missing = {};
    for (const key of ['collection', 'description']) {
      if (!product[key] && details[key]) missing[key] = details[key];
    }
    if (!Object.keys(product.specs ?? {}).length && Object.keys(details.specs).length) missing.specs = details.specs;
    if ((product.images?.length ?? 0) < 2 && images.length > (product.images?.length ?? 0)) missing.images = images;
    if (Object.keys(missing).length) await Product.updateOne({ _id: product._id }, { $set: missing });
  }
  return { product, created };
}
