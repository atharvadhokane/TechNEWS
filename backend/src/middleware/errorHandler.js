// Centralized error handler. Any `next(err)` call in a route/controller
// ends up here instead of crashing the process.
function errorHandler(err, req, res, next) {
  console.error(err);

  const status = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production' && status === 500
      ? 'Internal server error'
      : err.message || 'Internal server error';

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
