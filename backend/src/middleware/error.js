// 404 for any request that no route handled.
export function notFound(req, res, next) {
  const err = new Error(`Not found: ${req.method} ${req.originalUrl}`);
  err.status = 404;
  next(err);
}

// Single error handler. Responds with { error: { message } }.
// To send a specific status from a controller, throw httpError(status, message)
// (utils/http-error.js). Messages of other 5xx errors are hidden from the client.
// Express recognizes error handlers by their four parameters, so keep `next`.
export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || err.statusCode || 500;
  const isHidden = status >= 500 && !err.expose;

  if (isHidden) {
    console.error(err);
  }

  res.status(status).json({
    error: {
      message: isHidden ? 'Internal server error' : err.message,
    },
  });
}
