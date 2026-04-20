const dotenv = require("dotenv");

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/quietzone",
  corsOrigin: process.env.CORS_ORIGIN || "*",
  accessTokenSecret: process.env.JWT_ACCESS_SECRET || "dev-access-secret",
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret",
  accessTokenTtl: process.env.JWT_ACCESS_TTL || "15m",
  refreshTokenTtlDays: Number(process.env.JWT_REFRESH_TTL_DAYS || 30),
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || "",
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL || "",
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY || "",
  firebaseServiceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "",
};

module.exports = env;
