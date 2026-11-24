import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';

const router = Router();

/**
 * @api {get} /api/health Health check
 * @apiName GetHealth
 * @apiGroup Health
 * @apiVersion 1.0.0
 * @apiPermission Public
 * @apiDescription Whether the API is up and connected to MongoDB Atlas. The only endpoint that never answers 503 or 429, so uptime monitors can call it.
 *
 * @apiSuccess {String="ok"} status Always `ok` when the API answers.
 * @apiSuccess {String="connected","disconnected"} db State of the database connection.
 * @apiSuccessExample {json} Success
 *     HTTP/1.1 200 OK
 *     { "status": "ok", "db": "connected" }
 */
router.get('/', getHealth);

export default router;
