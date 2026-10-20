import { Product } from '../models/product.model.js';
import {
  DEAL_PERIODS,
  DEAL_TYPES,
  compareDeals,
  findDropDeals,
  findMarketDeals,
  loadPricesAt,
  periodStart,
} from '../services/deals.service.js';
import { getLatestFx, loadHistoricalRates, vndRates } from '../services/fx.service.js';
import { SUMMARY_FIELDS, getBrandNames, offerStages, toProductSummary } from '../services/products.service.js';
import { enumParam, intParam } from '../utils/query.js';

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 60;

// Deal in docs/API.md: the full product replaces `productId`.
function toDealDto(deal, product) {
  const { type, savingPct, ...details } = deal;
  delete details.productId;
  return { type, product, savingPct: Math.round(savingPct * 100) / 100, ...details };
}

export async function listDeals(req, res) {
  const period = enumParam(req.query, 'period', DEAL_PERIODS, 'today');
  const type = enumParam(req.query, 'type', DEAL_TYPES);
  const page = intParam(req.query, 'page', { fallback: 1 });
  const limit = intParam(req.query, 'limit', { max: MAX_LIMIT, fallback: DEFAULT_LIMIT });
  const withMarket = type !== 'drop';
  const withDrop = type !== 'market';

  const since = periodStart(period, new Date());
  const fx = await getLatestFx();
  const rates = vndRates(fx);
  // Deals are computed over the whole catalog, then paged.
  const [products, pricesThen, rateOn] = await Promise.all([
    Product.aggregate([{ $project: { _id: 1 } }, ...offerStages(rates)]),
    withDrop ? loadPricesAt(since) : null,
    withDrop ? loadHistoricalRates(since, since) : null,
  ]);
  const deals = [
    ...(withMarket ? findMarketDeals(products) : []),
    ...(withDrop ? findDropDeals(products, pricesThen, (currency) => rateOn(currency, since), since) : []),
  ].sort(compareDeals);
  const pageDeals = deals.slice((page - 1) * limit, page * limit);

  const [docs, brandNames] = await Promise.all([
    Product.aggregate([
      { $match: { _id: { $in: pageDeals.map((deal) => deal.productId) } } },
      { $project: SUMMARY_FIELDS },
      ...offerStages(rates),
    ]),
    getBrandNames(),
  ]);
  const summaries = new Map(docs.map((doc) => [String(doc._id), toProductSummary(doc, brandNames)]));

  res.json({
    period,
    since,
    items: pageDeals.map((deal) => toDealDto(deal, summaries.get(String(deal.productId)))),
    page,
    limit,
    total: deals.length,
    totalPages: Math.ceil(deals.length / limit),
    fx,
  });
}
