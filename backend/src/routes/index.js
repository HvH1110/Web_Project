import { Router } from 'express';
import { getSitemap } from '../controllers/sitemap.controller.js';
import { loadUser } from '../middleware/auth.js';
import { requireDb } from '../middleware/require-db.js';
import { noStore, publicCache } from '../middleware/response-headers.js';
import healthRoutes from './health.routes.js';
import brandRoutes from './brands.routes.js';
import productRoutes from './products.routes.js';
import dealRoutes from './deals.routes.js';
import authRoutes from './auth.routes.js';
import meRoutes from './me.routes.js';
import forumRoutes from './forum.routes.js';

const router = Router();

router.use('/health', healthRoutes);

/**
 * @api {get} /api/sitemap.xml Sitemap
 * @apiName GetSitemap
 * @apiGroup Health
 * @apiVersion 1.0.0
 * @apiPermission Public
 * @apiDescription Sitemap for search engines, as `application/xml` (not JSON). Lists `/`, `/search`, `/deals`, every `/brands/:slug` and every `/products/:brand/:ref` at the website's address. A product's `lastmod` is its latest price change or the day it was added, whichever is later. Rebuilt at most once an hour; `Cache-Control: public, max-age=86400`.
 *
 * @apiSuccessExample {xml} Success
 *     HTTP/1.1 200 OK
 *     <?xml version="1.0" encoding="UTF-8"?>
 *     <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
 *       <url><loc>https://maison-prix.vercel.app/</loc></url>
 *       <url><loc>https://maison-prix.vercel.app/products/rolex/126610LN</loc><lastmod>2026-11-20</lastmod></url>
 *     </urlset>
 *
 * @apiUse ErrorDb
 */
router.get('/sitemap.xml', requireDb, getSitemap);
router.use('/brands', requireDb, publicCache, brandRoutes);
router.use('/products', requireDb, publicCache, productRoutes);
router.use('/deals', requireDb, publicCache, dealRoutes);
router.use('/auth', noStore, requireDb, authRoutes);
router.use('/me', noStore, requireDb, loadUser, meRoutes);
router.use('/forum', noStore, requireDb, loadUser, forumRoutes);

export default router;
