import { Router } from 'express';
import { loadUser } from '../middleware/auth.js';
import { requireDb } from '../middleware/require-db.js';
import healthRoutes from './health.routes.js';
import brandRoutes from './brands.routes.js';
import productRoutes from './products.routes.js';
import dealRoutes from './deals.routes.js';
import authRoutes from './auth.routes.js';
import meRoutes from './me.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/brands', requireDb, brandRoutes);
router.use('/products', requireDb, productRoutes);
router.use('/deals', requireDb, dealRoutes);
router.use('/auth', requireDb, authRoutes);
router.use('/me', requireDb, loadUser, meRoutes);

export default router;
