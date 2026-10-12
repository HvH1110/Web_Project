import { Router } from 'express';
import { getBrand, listBrands } from '../controllers/brands.controller.js';

const router = Router();

router.get('/', listBrands);
router.get('/:slug', getBrand);

export default router;
