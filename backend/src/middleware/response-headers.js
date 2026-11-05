export function noSniff(req, res, next) {
  res.set('X-Content-Type-Options', 'nosniff');
  next();
}

// For responses about one member, which no shared cache may keep.
export function noStore(req, res, next) {
  res.set('Cache-Control', 'no-store');
  next();
}
