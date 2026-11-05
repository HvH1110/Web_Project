export function noSniff(req, res, next) {
  res.set('X-Content-Type-Options', 'nosniff');
  next();
}

// For catalog responses, the same for everyone and changing about once a day.
// Browsers reuse them for a few minutes, then revalidate with the ETag, which saves
// the hosting plan's outbound traffic. Errors never keep this (middleware/error.js).
export function publicCache(req, res, next) {
  res.set('Cache-Control', 'public, max-age=300');
  next();
}

// For responses about one member, which no shared cache may keep.
export function noStore(req, res, next) {
  res.set('Cache-Control', 'no-store');
  next();
}
