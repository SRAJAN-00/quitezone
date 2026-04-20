const crypto = require("crypto");

function requestLogger(req, res, next) {
  const startedAt = process.hrtime.bigint();
  const requestId = req.headers["x-request-id"] || crypto.randomUUID();

  req.requestId = String(requestId);
  res.setHeader("x-request-id", req.requestId);

  res.on("finish", () => {
    const elapsedNs = process.hrtime.bigint() - startedAt;
    const elapsedMs = Number(elapsedNs) / 1e6;
    const userId = req.auth?.userId || "anonymous";

    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        level: "info",
        event: "request.completed",
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Number(elapsedMs.toFixed(2)),
        userId,
      })
    );
  });

  next();
}

module.exports = {
  requestLogger,
};
