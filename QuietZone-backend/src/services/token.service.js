const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const env = require("../config/env");
const RefreshToken = require("../models/RefreshToken");
const HttpError = require("../utils/httpError");

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      type: "access",
    },
    env.accessTokenSecret,
    { expiresIn: env.accessTokenTtl }
  );
}

function signRefreshToken(user, jti) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      type: "refresh",
      jti,
    },
    env.refreshTokenSecret,
    { expiresIn: `${env.refreshTokenTtlDays}d` }
  );
}

async function issueTokenPair(user) {
  const jti = crypto.randomUUID();
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user, jti);
  const expiresAt = new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    userId: user._id,
    jti,
    tokenHash: hashToken(refreshToken),
    expiresAt,
  });

  return { accessToken, refreshToken };
}

function verifyAccessToken(token) {
  try {
    const payload = jwt.verify(token, env.accessTokenSecret);
    if (payload.type !== "access") {
      throw new HttpError(401, "Invalid access token type", "AUTH_INVALID_ACCESS_TOKEN");
    }
    return payload;
  } catch (error) {
    throw new HttpError(401, "Invalid or expired access token", "AUTH_INVALID_ACCESS_TOKEN");
  }
}

async function rotateRefreshToken(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, env.refreshTokenSecret);
  } catch (error) {
    throw new HttpError(401, "Invalid or expired refresh token", "AUTH_INVALID_REFRESH_TOKEN");
  }

  if (payload.type !== "refresh" || !payload.jti) {
    throw new HttpError(401, "Invalid refresh token", "AUTH_INVALID_REFRESH_TOKEN");
  }

  const storedToken = await RefreshToken.findOne({
    userId: payload.sub,
    jti: payload.jti,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!storedToken) {
    throw new HttpError(401, "Refresh token has been revoked", "AUTH_REFRESH_TOKEN_REVOKED");
  }

  if (storedToken.tokenHash !== hashToken(refreshToken)) {
    throw new HttpError(401, "Refresh token mismatch", "AUTH_REFRESH_TOKEN_MISMATCH");
  }

  storedToken.revokedAt = new Date();
  await storedToken.save();

  return payload;
}

async function revokeRefreshToken(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, env.refreshTokenSecret, { ignoreExpiration: true });
  } catch (error) {
    return false;
  }

  if (!payload?.jti) {
    return false;
  }

  const tokenDoc = await RefreshToken.findOne({
    userId: payload.sub,
    jti: payload.jti,
    revokedAt: null,
  });

  if (!tokenDoc) {
    return false;
  }

  tokenDoc.revokedAt = new Date();
  await tokenDoc.save();
  return true;
}

module.exports = {
  issueTokenPair,
  rotateRefreshToken,
  revokeRefreshToken,
  verifyAccessToken,
};
