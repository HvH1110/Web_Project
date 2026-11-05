import { Router } from 'express';
import { loadUser } from '../middleware/auth.js';
import { requireDb } from '../middleware/require-db.js';
import { noStore } from '../middleware/response-headers.js';
import healthRoutes from './health.routes.js';
import brandRoutes from './brands.routes.js';
import productRoutes from './products.routes.js';
import dealRoutes from './deals.routes.js';
import authRoutes from './auth.routes.js';
import meRoutes from './me.routes.js';
import forumRoutes from './forum.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/brands', requireDb, brandRoutes);
router.use('/products', requireDb, productRoutes);
router.use('/deals', requireDb, dealRoutes);
router.use('/auth', noStore, requireDb, authRoutes);
router.use('/me', noStore, requireDb, loadUser, meRoutes);
router.use('/forum', noStore, requireDb, loadUser, forumRoutes);

export default router;
