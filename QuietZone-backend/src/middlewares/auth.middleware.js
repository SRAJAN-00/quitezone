const User = require("../models/User");
const { verifyAccessToken } = require("../services/token.service");
const HttpError = require("../utils/httpError");

async function requireAuth(req, _res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const [, token] = authHeader.split(" ");
    if (!token) {
      throw new HttpError(401, "Authorization token missing", "AUTH_TOKEN_MISSING");
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).lean();
    if (!user) {
      throw new HttpError(401, "User no longer exists", "AUTH_USER_NOT_FOUND");
    }

    req.auth = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
    };
    next();
  } catch (error) {
    next(error);
  }
}

function requireRole(allowedRoles) {
  return (req, _res, next) => {
    if (!req.auth) {
      next(new HttpError(401, "Not authenticated", "AUTH_NOT_AUTHENTICATED"));
      return;
    }
    if (!allowedRoles.includes(req.auth.role)) {
      next(new HttpError(403, "Forbidden", "AUTH_FORBIDDEN"));
      return;
    }
    next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
};
