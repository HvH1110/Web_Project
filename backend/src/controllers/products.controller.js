import { MARKETS, Offer } from '../models/offer.model.js';
import { PricePoint } from '../models/price-point.model.js';
import { Product } from '../models/product.model.js';
import { getLatestFx, loadHistoricalRates, vndRates } from '../services/fx.service.js';
import { HISTORY_RANGES, buildHistorySeries, rangeStart } from '../services/price-history.service.js';
import {
  getBrandNames,
  offerStages,
  productKey,
  toProductDetail,
  toProductSummary,
} from '../services/products.service.js';
import { httpError } from '../utils/http-error.js';
import { enumParam, intParam, listParam, nonNegativeNumberParam, stringParam } from '../utils/query.js';
import { searchTerms, termRegex } from '../utils/search.js';

const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  name: { name: 1, _id: 1 },
  // Products without a price come last.
  price_asc: { hasPrice: -1, lowestPriceVnd: 1, _id: 1 },
  price_desc: { hasPrice: -1, lowestPriceVnd: -1, _id: 1 },
};
const MAX_QUERY_LENGTH = 100;
const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 60;
const SUMMARY_FIELDS = { brand: 1, ref: 1, name: 1, category: 1, collection: 1, images: 1, createdAt: 1 };

function parseSearchQuery(query) {
  const q = stringParam(query, 'q');
  if (q && q.length > MAX_QUERY_LENGTH) {
    throw httpError(400, `q must be at most ${MAX_QUERY_LENGTH} characters`);
  }

  const markets = listParam(query, 'market')?.map((market) => market.toUpperCase());
  if (markets?.some((market) => !MARKETS.includes(market))) {
    throw httpError(400, `market must be one of: ${MARKETS.join(', ')}`);
  }

  const minPriceVnd = nonNegativeNumberParam(query, 'minPriceVnd');
  const maxPriceVnd = nonNegativeNumberParam(query, 'maxPriceVnd');
  if (minPriceVnd !== undefined && maxPriceVnd !== undefined && minPriceVnd > maxPriceVnd) {
    throw httpError(400, 'minPriceVnd must not be greater than maxPriceVnd');
  }

  return {
    q,
    brands: listParam(query, 'brand')?.map((brand) => brand.toLowerCase()),
    categories: listParam(query, 'category')?.map((category) => category.toLowerCase()),
    collections: listParam(query, 'collection'),
    markets,
    minPriceVnd,
    maxPriceVnd,
    sort: enumParam(query, 'sort', Object.keys(SORTS), 'newest'),
    page: intParam(query, 'page', { fallback: 1 }),
    limit: intParam(query, 'limit', { max: MAX_LIMIT, fallback: DEFAULT_LIMIT }),
  };
}

// $match on product fields only; market and price filters need the offers.
function productMatch({ q, brands, categories, collections }) {
  const match = {};
  if (brands) {
    match.brand = { $in: brands };
  }
  if (categories) {
    match.category = { $in: categories };
  }
  if (collections) {
    match.collection = { $in: collections };
  }
  const terms = q ? searchTerms(q) : [];
  if (terms.length > 0) {
    // Every word must appear in at least one searchable field.
    match.$and = terms.map((term) => {
      const regex = termRegex(term);
      return { $or: [{ name: regex }, { collection: regex }, { ref: regex }, { brand: regex }] };
    });
  }
  return match;
}

export async function searchProducts(req, res) {
  const search = parseSearchQuery(req.query);
  const { markets, minPriceVnd, maxPriceVnd, sort, page, limit } = search;
  const fx = await getLatestFx();
  const rates = vndRates(fx);

  // Offers are joined before paging only when they decide which products
  // match or their order; otherwise only the products on the page get them.
  const hasPriceRange = minPriceVnd !== undefined || maxPriceVnd !== undefined;
  const offersFirst = Boolean(markets) || hasPriceRange || sort.startsWith('price');

  const pipeline = [{ $match: productMatch(search) }, { $project: SUMMARY_FIELDS }];
  if (offersFirst) {
    pipeline.push(...offerStages(rates, markets));
    if (markets) {
      pipeline.push({ $match: { 'offers.source.market': { $in: markets } } });
    }
    if (hasPriceRange) {
      const priceRange = {};
      if (minPriceVnd !== undefined) {
        priceRange.$gte = minPriceVnd;
      }
      if (maxPriceVnd !== undefined) {
        priceRange.$lte = maxPriceVnd;
      }
      pipeline.push({ $match: { lowestPriceVnd: priceRange } });
    }
    pipeline.push({ $set: { hasPrice: { $ne: ['$lowestPriceVnd', null] } } });
  }
  pipeline.push({
    $facet: {
      total: [{ $count: 'count' }],
      items: [
        { $sort: SORTS[sort] },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        ...(offersFirst ? [] : offerStages(rates, markets)),
      ],
    },
  });

  const aggregate = Product.aggregate(pipeline);
  if (sort === 'name') {
    // Alphabetical regardless of case and accents.
    aggregate.collation({ locale: 'en' });
  }
  const [[result], brandNames] = await Promise.all([aggregate, getBrandNames()]);
  const total = result.total[0]?.count ?? 0;

  res.json({
    items: result.items.map((doc) => toProductSummary(doc, brandNames)),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    fx,
  });
}

export async function getProduct(req, res) {
  const [fx, brandNames] = await Promise.all([getLatestFx(), getBrandNames()]);
  const [doc] = await Product.aggregate([
    { $match: productKey(req.params) },
    { $limit: 1 },
    ...offerStages(vndRates(fx)),
  ]);
  if (!doc) {
    throw httpError(404, 'Product not found');
  }

  res.json({ product: toProductDetail(doc, brandNames), fx });
}

export async function getProductHistory(req, res) {
  const range = enumParam(req.query, 'range', HISTORY_RANGES, '1y');
  const product = await Product.findOne(productKey(req.params)).select('_id').lean();
  if (!product) {
    throw httpError(404, 'Product not found');
  }

  const [pricePoints, offers] = await Promise.all([
    PricePoint.find({ productId: product._id }).sort({ observedAt: 1 }).lean(),
    Offer.find({ productId: product._id }).select('source price lastSeenAt -_id').lean(),
  ]);
  const to = new Date();
  const from = rangeStart(range, to, pricePoints[0]?.observedAt);
  const rateOn = pricePoints.some((point) => point.currency !== 'VND')
    ? await loadHistoricalRates(from, to)
    : (currency) => (currency === 'VND' ? 1 : null);

  res.json({
    range,
    from,
    to,
    series: buildHistorySeries({ pricePoints, offers, range, from, to, rateOn }),
  });
}
