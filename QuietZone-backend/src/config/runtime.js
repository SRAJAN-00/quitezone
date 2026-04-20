const env = require("./env");

function validateProductionConfig() {
  const issues = [];
  if (env.nodeEnv !== "production") {
    return issues;
  }

  if (!env.mongoUri) {
    issues.push("MONGODB_URI is required in production");
  }
  if (!env.accessTokenSecret || env.accessTokenSecret === "dev-access-secret") {
    issues.push("JWT_ACCESS_SECRET must be set to a strong non-default value in production");
  }
  if (!env.refreshTokenSecret || env.refreshTokenSecret === "dev-refresh-secret") {
    issues.push("JWT_REFRESH_SECRET must be set to a strong non-default value in production");
  }
  if (!env.corsOrigin || env.corsOrigin === "*") {
    issues.push("CORS_ORIGIN should be an explicit allowlist in production");
  }

  return issues;
}

module.exports = {
  validateProductionConfig,
};
