import { Router } from 'express';
import { getProduct, getProductHistory, searchProducts } from '../controllers/products.controller.js';

const router = Router();

/**
 * @api {get} /api/products Search products
 * @apiName SearchProducts
 * @apiGroup Catalog
 * @apiVersion 1.0.0
 * @apiPermission Public
 * @apiDescription Search and filter the catalogue. Each result carries its offers in every market, so a result card can show the price per market and where to buy.
 *
 * In every sort, products with a current price come first, then products with a picture that can load, then the chosen order. A product without a current price carries `lastPrice`, its most recent recorded price: show it with its date, never as today's price.
 *
 * @apiExample {curl} Example
 *     curl "https://maison-prix.vercel.app/api/products?q=submariner&market=VN,SG&maxPriceVnd=400000000&sort=price_asc"
 *
 * @apiQuery {String{..100}} [q] Words that must all appear in the name, collection, reference or brand slug. Ignores case and accents (`panthere` finds "Panthère"); partial words match.
 * @apiQuery {String} [brand] Brand slug; comma-separate several (`rolex,omega`).
 * @apiQuery {String} [category] Product category; comma-separate several (`bags,shoes`).
 * @apiQuery {String} [collection] Exact collection name from `GET /api/brands/:slug`; comma-separate several.
 * @apiQuery {String} [market] `VN`, `SG` or `HK`, comma-separate several. Keeps products with an offer in one of them (`market=VN` is "available in Vietnam") and restricts which offers count for the price filter and sort.
 * @apiQuery {Number{0-}} [minPriceVnd] Lowest `lowestPriceVnd`, inclusive.
 * @apiQuery {Number{0-}} [maxPriceVnd] Highest `lowestPriceVnd`, inclusive.
 * @apiQuery {String="newest","name","price_asc","price_desc"} [sort=newest] Order within each group.
 * @apiQuery {Number{1-}} [page=1] Page number.
 * @apiQuery {Number{1-60}} [limit=24] Results per page.
 *
 * @apiSuccess {Object[]} items The products of this page.
 * @apiUse ProductFields
 * @apiSuccess {Object} items.lastPrice Most recent recorded price in any market, or `null`: `{ price, currency, priceVnd, market, observedAt }`, `priceVnd` at Vietcombank's rate of that day.
 * @apiUse Paging
 * @apiUse Fx
 * @apiSuccessExample {json} Success
 *     HTTP/1.1 200 OK
 *     {
 *       "items": [
 *         {
 *           "id": "6720f1c2a1b2c3d4e5f60718",
 *           "brand": "rolex",
 *           "brandName": "Rolex",
 *           "ref": "126610LN",
 *           "name": "Submariner Date",
 *           "category": "watches",
 *           "collection": "Submariner",
 *           "images": [{ "url": "https://…/126610ln.png", "alt": "Submariner Date", "sourceId": "thg-sg" }],
 *           "lowestPriceVnd": 255555000,
 *           "offers": [
 *             {
 *               "market": "SG",
 *               "source": { "id": "thg-sg", "name": "The Hour Glass", "type": "authorized-dealer" },
 *               "url": "https://…",
 *               "currency": "SGD",
 *               "price": 13450,
 *               "priceVnd": 255555000,
 *               "available": true,
 *               "lastSeenAt": "2026-11-24T02:00:00.000Z",
 *               "origin": "crawl"
 *             }
 *           ],
 *           "lastPrice": { "price": 13450, "currency": "SGD", "priceVnd": 255555000, "market": "SG", "observedAt": "2026-10-12T02:00:00.000Z" }
 *         }
 *       ],
 *       "page": 1,
 *       "limit": 24,
 *       "total": 135,
 *       "totalPages": 6,
 *       "fx": { "date": "2026-11-24", "vndPer": { "SGD": 19000, "HKD": 3350, "USD": 26300 } }
 *     }
 *
 * @apiError (Error 4xx) 400 Invalid parameter: unknown `market` or `sort`, `page` not a positive integer, `limit` above 60, a negative price, `minPriceVnd` greater than `maxPriceVnd`, or `q` too long.
 * @apiUse ErrorRate
 * @apiUse ErrorDb
 * @apiUse ErrorExample
 */
router.get('/', searchProducts);

/**
 * @api {get} /api/products/:brand/:ref Get a product
 * @apiName GetProduct
 * @apiGroup Catalog
 * @apiVersion 1.0.0
 * @apiPermission Public
 * @apiDescription One product for its page: every search field (without `lastPrice`), plus the official description and specifications. `ref` is matched ignoring case and spaces; URL-encode it.
 *
 * @apiParam {String} brand Brand slug, e.g. `rolex`.
 * @apiParam {String} ref Reference code, e.g. `126610LN`.
 *
 * @apiSuccess {Object} product The product: every field of a search result, plus the fields below.
 * @apiSuccess {String} product.description Text from the official product page.
 * @apiSuccess {Object} product.specs Free-form specifications, e.g. `{ "Case diameter": "41 mm" }`.
 * @apiSuccess {String} product.createdAt When the product was added to the catalogue.
 * @apiSuccess {String} product.updatedAt When it was last updated.
 * @apiUse Fx
 * @apiSuccessExample {json} Success
 *     HTTP/1.1 200 OK
 *     {
 *       "product": {
 *         "id": "6720f1c2a1b2c3d4e5f60718",
 *         "brand": "rolex",
 *         "ref": "126610LN",
 *         "name": "Submariner Date",
 *         "…": "…",
 *         "description": "Text from the official product page.",
 *         "specs": { "Case diameter": "41 mm", "Material": "Oystersteel" },
 *         "createdAt": "2026-10-01T02:00:00.000Z",
 *         "updatedAt": "2026-11-24T02:00:00.000Z"
 *       },
 *       "fx": { "date": "2026-11-24", "vndPer": { "SGD": 19000, "HKD": 3350, "USD": 26300 } }
 *     }
 *
 * @apiError (Error 4xx) 404 `Product not found`.
 * @apiUse ErrorRate
 * @apiUse ErrorDb
 */
router.get('/:brand/:ref', getProduct);

/**
 * @api {get} /api/products/:brand/:ref/history Price history
 * @apiName GetProductHistory
 * @apiGroup Catalog
 * @apiVersion 1.0.0
 * @apiPermission Public
 * @apiDescription Price history for the chart: one series per store (normally one per market). A point is stored only when the price changes, so draw the original-currency line as a step line. The `vnd` line is sampled daily (`1y`) or weekly (`5y`, `all`) at the exchange rate of each day, so it moves with exchange rates.
 *
 * @apiParam {String} brand Brand slug.
 * @apiParam {String} ref Reference code.
 * @apiQuery {String="1y","5y","all"} [range=1y] Period of the chart.
 *
 * @apiSuccess {String} range The range requested.
 * @apiSuccess {String} from Start of the x-axis (for `all`, the oldest point).
 * @apiSuccess {String} to End of the x-axis: now, rounded up to 5 minutes.
 * @apiSuccess {Object[]} series One line per store, sorted by market (`VN`, `SG`, `HK`). Empty when there is no history.
 * @apiSuccess {String} series.market Market.
 * @apiSuccess {Object} series.source `{ id, name, type }`; `name` and `type` are `null` when the store no longer has a current offer.
 * @apiSuccess {String} series.currency Currency of `points`.
 * @apiSuccess {String} series.lastSeenAt Until when the last price is known to hold, or `null`.
 * @apiSuccess {Object[]} series.points Price changes, oldest first: `{ date, price, origin, archiveUrl, sourceUrl, carried }`. `origin` is `crawl`, `wayback` (Internet Archive copy at `archiveUrl`) or `manual` (read by a person from `sourceUrl`). `carried: true` marks the price already in effect at `from`.
 * @apiSuccess {Object[]} series.vnd The same line in VND: `{ date, priceVnd }`, `priceVnd` is `null` where no rate is known (leave a gap).
 * @apiSuccessExample {json} Success
 *     HTTP/1.1 200 OK
 *     {
 *       "range": "1y",
 *       "from": "2025-11-24T09:00:00.000Z",
 *       "to": "2026-11-24T09:00:00.000Z",
 *       "series": [
 *         {
 *           "market": "SG",
 *           "source": { "id": "thg-sg", "name": "The Hour Glass", "type": "authorized-dealer" },
 *           "currency": "SGD",
 *           "lastSeenAt": "2026-11-24T02:00:00.000Z",
 *           "points": [
 *             { "date": "2025-11-24T09:00:00.000Z", "price": 12950, "origin": "crawl", "archiveUrl": null, "sourceUrl": null, "carried": true },
 *             { "date": "2026-03-01T02:00:00.000Z", "price": 13450, "origin": "crawl", "archiveUrl": null, "sourceUrl": null, "carried": false }
 *           ],
 *           "vnd": [
 *             { "date": "2025-11-24T09:00:00.000Z", "priceVnd": 245000000 },
 *             { "date": "2025-11-25T00:00:00.000Z", "priceVnd": 245100000 }
 *           ]
 *         }
 *       ]
 *     }
 *
 * @apiError (Error 4xx) 400 `range` is not `1y`, `5y` or `all`.
 * @apiError (Error 4xx) 404 `Product not found`.
 * @apiUse ErrorRate
 * @apiUse ErrorDb
 */
router.get('/:brand/:ref/history', getProductHistory);

export default router;
