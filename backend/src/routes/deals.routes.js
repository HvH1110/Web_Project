import { Router } from 'express';
import { listDeals } from '../controllers/deals.controller.js';

const router = Router();

/**
 * @api {get} /api/deals List deals
 * @apiName ListDeals
 * @apiGroup Catalog
 * @apiVersion 1.0.0
 * @apiPermission Public
 * @apiDescription Deals, ranked by `savingPct`, highest first. Official luxury prices rarely fall, so a deal is one of two kinds:
 *
 * - `market`, the cheapest market: buying the piece in its cheapest market instead of its dearest, comparing current prices in VND.
 * - `drop`, a price drop: the current price is at least 1% lower than at the start of the period, in the store's currency or in VND.
 *
 * Only current, crawled prices count: prices entered by hand and offers not seen for 14 days are left out. Computed over the whole catalogue and kept for 5 minutes per `period`.
 *
 * @apiExample {curl} Example
 *     curl "https://maison-prix.vercel.app/api/deals?period=month&type=drop"
 *
 * @apiQuery {String="today","month","year"} [period=today] Start of the current day, month or year in Vietnam time (UTC+7). Only affects `drop` deals.
 * @apiQuery {String="market","drop"} [type] Only one kind. Without it, both share one ranking.
 * @apiQuery {Number{1-}} [page=1] Page number.
 * @apiQuery {Number{1-60}} [limit=24] Results per page.
 *
 * @apiSuccess {String} period The period requested.
 * @apiSuccess {String} since Start of the period.
 * @apiSuccess {Object[]} items The deals.
 * @apiSuccess {String="market","drop"} items.type Kind of deal.
 * @apiSuccess {Object} items.product The product, as in `GET /api/products`.
 * @apiSuccess {Number} items.savingPct Percentage saved, 2 decimals, always above 0 (at least 1 for `drop`).
 * @apiSuccess {Object} items.cheapest `market` only: `{ market, priceVnd, offer }`.
 * @apiSuccess {Object} items.dearest `market` only: `{ market, priceVnd, offer }`.
 * @apiSuccess {String} items.market `drop` only: the market.
 * @apiSuccess {String} items.currency `drop` only: currency of `priceThen` and `priceNow`.
 * @apiSuccess {Number} items.priceThen `drop` only: last price at or before `since`.
 * @apiSuccess {Number} items.priceNow `drop` only: current price.
 * @apiSuccess {Number} items.priceVndThen `drop` only: `priceThen` at the rate of `since`, or `null`.
 * @apiSuccess {Number} items.priceVndNow `drop` only: `priceNow` at the latest rate, or `null`.
 * @apiSuccess {Object} items.offer `drop` only: the current offer, for "where to buy".
 * @apiUse Paging
 * @apiUse Fx
 * @apiSuccessExample {json} Success
 *     HTTP/1.1 200 OK
 *     {
 *       "period": "month",
 *       "since": "2026-10-31T17:00:00.000Z",
 *       "items": [
 *         {
 *           "type": "market",
 *           "product": { "brand": "cartier", "ref": "WSSA0018", "name": "Santos de Cartier watch", "…": "…" },
 *           "savingPct": 12.35,
 *           "cheapest": { "market": "HK", "priceVnd": 238000000, "offer": { "…": "…" } },
 *           "dearest": { "market": "VN", "priceVnd": 271500000, "offer": { "…": "…" } }
 *         },
 *         {
 *           "type": "drop",
 *           "product": { "…": "…" },
 *           "savingPct": 1.8,
 *           "market": "SG",
 *           "currency": "SGD",
 *           "priceThen": 13450,
 *           "priceNow": 13450,
 *           "priceVndThen": 255555000,
 *           "priceVndNow": 250955000,
 *           "since": "2026-10-31T17:00:00.000Z",
 *           "offer": { "…": "…" }
 *         }
 *       ],
 *       "page": 1,
 *       "limit": 24,
 *       "total": 18,
 *       "totalPages": 1,
 *       "fx": { "date": "2026-11-24", "vndPer": { "SGD": 19000, "HKD": 3350, "USD": 26300 } }
 *     }
 *
 * @apiError (Error 4xx) 400 `period` or `type` is not an allowed value, `page` is not a positive integer, or `limit` is outside 1 to 60.
 * @apiUse ErrorRate
 * @apiUse ErrorDb
 */
router.get('/', listDeals);

export default router;
