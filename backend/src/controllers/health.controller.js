import { dbStatus } from '../config/db.js';

export function getHealth(req, res) {
  res.json({ status: 'ok', db: dbStatus() });
}
