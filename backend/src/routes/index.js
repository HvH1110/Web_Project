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
router.get('/sitemap.xml', requireDb, getSitemap);
router.use('/brands', requireDb, publicCache, brandRoutes);
router.use('/products', requireDb, publicCache, productRoutes);
router.use('/deals', requireDb, publicCache, dealRoutes);
router.use('/auth', noStore, requireDb, authRoutes);
router.use('/me', noStore, requireDb, loadUser, meRoutes);
router.use('/forum', noStore, requireDb, loadUser, forumRoutes);

export default router;
