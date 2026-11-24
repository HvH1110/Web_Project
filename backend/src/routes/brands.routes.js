import { Router } from 'express';
import { getBrand, listBrands } from '../controllers/brands.controller.js';

const router = Router();

/**
 * @api {get} /api/brands List houses
 * @apiName ListBrands
 * @apiGroup Catalog
 * @apiVersion 1.0.0
 * @apiPermission Public
 * @apiDescription All houses, in the order the home page shows them: Louis Vuitton, Dior, Chanel, Cartier, Van Cleef & Arpels, Rolex, Omega, IWC.
 *
 * @apiQuery {String="fashion","jewelry","watches"} [category] Only houses of this category.
 *
 * @apiSuccess {Object[]} items The houses.
 * @apiSuccess {String} items.slug URL name, e.g. `rolex`.
 * @apiSuccess {String} items.name Display name.
 * @apiSuccess {String="fashion","jewelry","watches"} items.category The house's category.
 * @apiSuccess {Number} items.foundedYear Year founded.
 * @apiSuccess {String} items.founder Founder(s).
 * @apiSuccess {String} items.city City where the house was founded.
 * @apiSuccess {String} items.country Country where the house was founded.
 * @apiSuccess {String} items.history Short history, 3 to 5 sentences.
 * @apiSuccess {Object[]} items.signatureProducts Signature pieces: `{ name, year, description }` (`year` can be `null`).
 * @apiSuccess {String="draft","reviewed"} items.contentStatus Whether the editorial text was reviewed.
 * @apiSuccess {Object} items.photo Freely licensed photo of the house: `{ url, alt, credit, sourceUrl, license, licenseUrl }`, or `null`. Always show it with its credit and license.
 * @apiSuccess {Number} items.productCount Number of tracked products.
 * @apiSuccess {Object[]} items.covers Tracked products with a picture, to illustrate the house: `{ piece, brand, ref, name, collection, image, credit }`. Up to 3 per signature piece (`piece` is its name), then up to 6 for the house (`piece: null`). Best pictures first.
 * @apiSuccessExample {json} Success
 *     HTTP/1.1 200 OK
 *     {
 *       "items": [
 *         {
 *           "slug": "rolex",
 *           "name": "Rolex",
 *           "category": "watches",
 *           "foundedYear": 1905,
 *           "founder": "Hans Wilsdorf and Alfred Davis",
 *           "city": "London",
 *           "country": "United Kingdom",
 *           "history": "…",
 *           "signatureProducts": [{ "name": "Submariner", "year": 1953, "description": "…" }],
 *           "contentStatus": "reviewed",
 *           "photo": { "url": "https://upload.wikimedia.org/…", "alt": "Rolex store window", "credit": "…", "sourceUrl": "https://commons.wikimedia.org/…", "license": "CC BY-SA 4.0", "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/" },
 *           "productCount": 285,
 *           "covers": [{ "piece": "Submariner", "brand": "rolex", "ref": "126610LN", "name": "Submariner Date", "collection": "Submariner", "image": { "url": "https://…", "alt": "…", "sourceId": "thg-sg" }, "credit": "The Hour Glass" }]
 *         }
 *       ]
 *     }
 *
 * @apiError (Error 4xx) 400 `category` is not one of the allowed values.
 * @apiUse ErrorRate
 * @apiUse ErrorDb
 * @apiUse ErrorExample
 */
router.get('/', listBrands);

/**
 * @api {get} /api/brands/:slug Get a house
 * @apiName GetBrand
 * @apiGroup Catalog
 * @apiVersion 1.0.0
 * @apiPermission Public
 * @apiDescription One house for its page: every field of the list, plus its collections. Its products come from `GET /api/products?brand=:slug`.
 *
 * @apiParam {String} slug The house's slug, e.g. `cartier`.
 *
 * @apiSuccess {Object} brand Every field of a house in `GET /api/brands`, plus `collections`.
 * @apiSuccess {Object[]} brand.collections Collections of the house's tracked products, sorted by name: `{ name, productCount }`. Use `name` as the `collection` filter in search.
 * @apiSuccessExample {json} Success
 *     HTTP/1.1 200 OK
 *     { "brand": { "slug": "cartier", "name": "Cartier", "…": "…", "collections": [{ "name": "Santos de Cartier", "productCount": 96 }] } }
 *
 * @apiError (Error 4xx) 404 `Brand not found`.
 * @apiUse ErrorRate
 * @apiUse ErrorDb
 */
router.get('/:slug', getBrand);

export default router;
