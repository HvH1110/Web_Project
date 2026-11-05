import { PricePoint } from '../models/price-point.model.js';
import { Product } from '../models/product.model.js';
import { getLatestFx, loadHistoricalRates, vndRates } from './fx.service.js';
import { offerStages, toOfferDto } from './products.service.js';

// Deals, as defined in docs/PRODUCT.md "What counts as a deal".
export const DEAL_PERIODS = ['today', 'month', 'year'];
export const DEAL_TYPES = ['market', 'drop'];
// Smaller drops are mostly daily exchange-rate noise. Market deals have no minimum.
const MIN_DROP_PCT = 1;
// Deals are computed from the whole catalog, about 1 MB read from the database,
// and prices change at most a few times a day.
const CACHE_MS = 5 * 60 * 1000;

// Vietnam has no daylight saving time.
const VN_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

// Start of the current day, month or year in Vietnam time, as a UTC Date.
export function periodStart(period, now) {
  // Shifted so the UTC getters read Vietnamese wall-clock time.
  const local = new Date(now.getTime() + VN_UTC_OFFSET_MS);
  const year = local.getUTCFullYear();
  const month = period === 'year' ? 0 : local.getUTCMonth();
  const day = period === 'today' ? local.getUTCDate() : 1;
  return new Date(Date.UTC(year, month, day) - VN_UTC_OFFSET_MS);
}

// Each source's price in effect at `date`: the last price point at or before it.
// Map `${productId}:${sourceId}` -> { price, currency, origin }.
export async function loadPricesAt(date) {
  const rows = await PricePoint.aggregate([
    { $match: { observedAt: { $lte: date } } },
    { $sort: { observedAt: 1 } },
    {
      $group: {
        _id: { productId: '$productId', sourceId: '$sourceId' },
        price: { $last: '$price' },
        currency: { $last: '$currency' },
        origin: { $last: '$origin' },
      },
    },
  ]).allowDiskUse(true);
  return new Map(
    rows.map(({ _id, price, currency, origin }) => [`${_id.productId}:${_id.sourceId}`, { price, currency, origin }]),
  );
}

function percentOff(before, after) {
  return ((before - after) / before) * 100;
}

function marketPrice(offer) {
  return { market: offer.source.market, priceVnd: offer.priceVnd, offer: toOfferDto(offer) };
}

// Hand-entered prices never count in deals (docs/PRODUCT.md): they can be weeks
// old. Older rows may have no origin at all, and those are crawled.
function isManual(priced) {
  return priced.origin === 'manual';
}

// `products`: [{ _id, offers }] from a pipeline with offerStages(), so every
// offer has its current priceVnd.

// Cheapest vs most expensive market, from current prices in VND. Compares the
// cheapest offer of each market; needs priced offers in at least two markets.
export function findMarketDeals(products) {
  const deals = [];
  for (const product of products) {
    const cheapestByMarket = new Map();
    for (const offer of product.offers) {
      const market = offer.source?.market;
      if (isManual(offer) || offer.priceVnd == null || !market) {
        continue;
      }
      const current = cheapestByMarket.get(market);
      if (!current || offer.priceVnd < current.priceVnd) {
        cheapestByMarket.set(market, offer);
      }
    }
    if (cheapestByMarket.size < 2) {
      continue;
    }
    const sorted = [...cheapestByMarket.values()].sort((a, b) => a.priceVnd - b.priceVnd);
    const cheapest = sorted[0];
    const dearest = sorted.at(-1);
    if (cheapest.priceVnd < dearest.priceVnd) {
      deals.push({
        type: 'market',
        productId: product._id,
        savingPct: percentOff(dearest.priceVnd, cheapest.priceVnd),
        cheapest: marketPrice(cheapest),
        dearest: marketPrice(dearest),
      });
    }
  }
  return deals;
}

// Current price lower than at `since`, in the source's own currency or in VND.
// `pricesThen` comes from loadPricesAt(since); `rateThen(currency)` is VND per
// unit at `since`, or null. savingPct is the larger of the two drops, at least
// MIN_DROP_PCT. One deal per product and market: the source with the biggest drop.
// A manual price at `since` means no comparison, not a fallback to an older point,
// which could show a drop from a price that had already changed.
export function findDropDeals(products, pricesThen, rateThen, since) {
  const deals = [];
  for (const product of products) {
    const bestByMarket = new Map();
    for (const offer of product.offers) {
      const then = pricesThen.get(`${product._id}:${offer.source?.id}`);
      if (isManual(offer) || offer.price == null || !then || isManual(then) || !(then.price > 0) || then.currency !== offer.currency) {
        continue;
      }
      const rate = rateThen(offer.currency);
      const priceVndThen = rate == null ? null : Math.round(then.price * rate);
      const priceVndNow = offer.priceVnd ?? null;

      const drops = [];
      if (offer.price < then.price) {
        drops.push(percentOff(then.price, offer.price));
      }
      if (priceVndThen != null && priceVndNow != null && priceVndNow < priceVndThen) {
        drops.push(percentOff(priceVndThen, priceVndNow));
      }
      const savingPct = Math.max(0, ...drops);
      if (savingPct < MIN_DROP_PCT) {
        continue;
      }

      const deal = {
        type: 'drop',
        productId: product._id,
        savingPct,
        market: offer.source.market,
        currency: offer.currency,
        priceThen: then.price,
        priceNow: offer.price,
        priceVndThen,
        priceVndNow,
        since,
        offer: toOfferDto(offer),
      };
      const best = bestByMarket.get(deal.market);
      if (!best || deal.savingPct > best.savingPct) {
        bestByMarket.set(deal.market, deal);
      }
    }
    deals.push(...bestByMarket.values());
  }
  return deals;
}

// Highest saving first; stable order for paging.
export function compareDeals(a, b) {
  return (
    b.savingPct - a.savingPct ||
    String(a.productId).localeCompare(String(b.productId)) ||
    a.type.localeCompare(b.type) ||
    String(a.market ?? '').localeCompare(String(b.market ?? ''))
  );
}

async function computeDeals(since) {
  const fx = await getLatestFx();
  const rates = vndRates(fx);
  const [products, pricesThen, rateOn] = await Promise.all([
    Product.aggregate([{ $project: { _id: 1 } }, ...offerStages(rates)]),
    loadPricesAt(since),
    loadHistoricalRates(since, since),
  ]);
  const deals = [
    ...findMarketDeals(products),
    ...findDropDeals(products, pricesThen, (currency) => rateOn(currency, since), since),
  ].sort(compareDeals);
  return { fx, rates, deals };
}

const cache = new Map();

// { since, fx, rates, deals } of a period, recomputed every CACHE_MS. Requests
// arriving during a computation share it. Failures aren't kept.
export async function loadDeals(period, now = new Date()) {
  const since = periodStart(period, now);
  const cached = cache.get(period);
  if (cached && cached.expiresAt > now.getTime() && cached.since.getTime() === since.getTime()) {
    return { since, ...(await cached.result) };
  }
  const result = computeDeals(since);
  const entry = { since, expiresAt: now.getTime() + CACHE_MS, result };
  cache.set(period, entry);
  result.catch(() => {
    if (cache.get(period) === entry) {
      cache.delete(period);
    }
  });
  return { since, ...(await result) };
}

export function clearDealsCache() {
  cache.clear();
}
