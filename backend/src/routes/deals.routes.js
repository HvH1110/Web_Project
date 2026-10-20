import { Router } from 'express';
import { listDeals } from '../controllers/deals.controller.js';

const router = Router();

router.get('/', listDeals);

export default router;
