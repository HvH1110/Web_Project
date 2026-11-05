import { rateLimit } from './rate-limit.js';

const MINUTE = 60 * 1000;
// Mounted on /api. The host's health check must never be refused.
const unlessHealth = (key) => (req) => (req.path === '/health' ? null : key(req));

// Limits on all requests, before any database work or reading the body. The
// overall one still holds when IP addresses are faked (require-proxy.js): it
// keeps Atlas and the hosting plan's traffic safe, at the price of refusing
// everyone during such an attack.
export const apiLimits = [
  rateLimit({ windowMs: MINUTE, max: 300, key: unlessHealth((req) => req.ip) }),
  rateLimit({ windowMs: MINUTE, max: 1200, key: unlessHealth(() => 'all') }),
];
