import { Brand } from '../models/brand.model.js';
import { MARKETS, Offer } from '../models/offer.model.js';

// The product fields a ProductSummary needs, for $project.
export const SUMMARY_FIELDS = { brand: 1, ref: 1, name: 1, category: 1, collection: 1, images: 1, createdAt: 1 };

// Aggregation stages for a pipeline over `products`: attach each product's
// offers, convert every offer price to VND with `rates` (from vndRates()), and
// set lowestPriceVnd from the offers in `markets` (all offers when not given).
export function offerStages(rates, markets) {
  const rateBranches = Object.entries(rates)
    .filter(([, rate]) => typeof rate === 'number')
    .map(([currency, rate]) => ({ case: { $eq: ['$$offer.currency', currency] }, then: rate }));
  const priceVnd = {
    $round: [
      { $multiply: ['$$offer.price', { $switch: { branches: rateBranches, default: null } }] },
      0,
    ],
  };
  const countedOffers = markets
    ? { $filter: { input: '$offers', as: 'offer', cond: { $in: ['$$offer.source.market', markets] } } }
    : '$offers';

  return [
    {
      $lookup: {
        from: Offer.collection.collectionName,
        localField: '_id',
        foreignField: 'productId',
        as: 'offers',
        pipeline: [
          { $project: { _id: 0, source: 1, url: 1, currency: 1, price: 1, available: 1, lastSeenAt: 1 } },
        ],
      },
    },
    {
      $set: {
        offers: {
          $map: { input: '$offers', as: 'offer', in: { $mergeObjects: ['$$offer', { priceVnd }] } },
        },
      },
    },
    // $min skips nulls and gives null for an empty list.
    { $set: { lowestPriceVnd: { $min: { $map: { input: countedOffers, as: 'offer', in: '$$offer.priceVnd' } } } } },
  ];
}

// Sort helper: VN, SG, HK, then anything unknown.
export function marketRank(market) {
  const index = MARKETS.indexOf(market);
  return index === -1 ? MARKETS.length : index;
}

function compareNullsLast(a, b) {
  if (a == null || b == null) {
    return (a == null) - (b == null);
  }
  return a - b;
}

// Offer in docs/API.md.
export function toOfferDto(offer) {
  return {
    market: offer.source?.market ?? null,
    source: {
      id: offer.source?.id ?? null,
      name: offer.source?.name ?? null,
      type: offer.source?.type ?? null,
    },
    url: offer.url ?? null,
    currency: offer.currency ?? null,
    price: offer.price ?? null,
    priceVnd: offer.priceVnd ?? null,
    available: offer.available ?? null,
    lastSeenAt: offer.lastSeenAt ?? null,
  };
}

// Brand slug -> display name, from the backend's `brands` collection.
export async function getBrandNames() {
  const brands = await Brand.find().select('slug name -_id').lean();
  return new Map(brands.map((brand) => [brand.slug, brand.name]));
}

// ProductSummary in docs/API.md. `doc` comes from a pipeline with offerStages().
export function toProductSummary(doc, brandNames) {
  return {
    id: String(doc._id),
    brand: doc.brand,
    brandName: brandNames.get(doc.brand) ?? null,
    ref: doc.ref,
    name: doc.name,
    category: doc.category ?? null,
    collection: doc.collection ?? null,
    images: (doc.images ?? []).map((image) => ({
      url: image.url,
      alt: image.alt ?? null,
      sourceId: image.sourceId ?? null,
    })),
    lowestPriceVnd: doc.lowestPriceVnd ?? null,
    offers: (doc.offers ?? [])
      .map(toOfferDto)
      .sort((a, b) => marketRank(a.market) - marketRank(b.market) || compareNullsLast(a.priceVnd, b.priceVnd)),
  };
}

export function toProductDetail(doc, brandNames) {
  return {
    ...toProductSummary(doc, brandNames),
    description: doc.description ?? null,
    specs: doc.specs ?? {},
    createdAt: doc.createdAt ?? null,
    updatedAt: doc.updatedAt ?? null,
  };
}

// The URL key of a product: brand slug + reference code, normalized like DATA.md.
export function productKey(params) {
  return {
    brand: params.brand.trim().toLowerCase(),
    ref: params.ref.toUpperCase().replace(/\s+/g, ''),
  };
}
