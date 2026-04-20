function fallbackCodeFromStatus(statusCode) {
  if (statusCode === 400) return "BAD_REQUEST";
  if (statusCode === 401) return "UNAUTHORIZED";
  if (statusCode === 403) return "FORBIDDEN";
  if (statusCode === 404) return "NOT_FOUND";
  if (statusCode === 409) return "CONFLICT";
  if (statusCode === 429) return "TOO_MANY_REQUESTS";
  return "INTERNAL_ERROR";
}

function notFoundHandler(_req, res) {
  res.status(404).json({
    message: "Route not found",
    code: "ROUTE_NOT_FOUND",
  });
}

function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;
  const payload = {
    message: error.message || "Internal server error",
    code: error.code || fallbackCodeFromStatus(statusCode),
  };

  if (error.details !== undefined) {
    payload.details = error.details;
  }

  res.status(statusCode).json({
    ...payload,
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
