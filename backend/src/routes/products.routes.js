import { Router } from 'express';
import { getProduct, getProductHistory, searchProducts } from '../controllers/products.controller.js';

const router = Router();

router.get('/', searchProducts);
router.get('/:brand/:ref', getProduct);
router.get('/:brand/:ref/history', getProductHistory);

export default router;
