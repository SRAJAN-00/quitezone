const User = require("../models/User");
const {
  issueTokenPair,
  rotateRefreshToken,
  revokeRefreshToken,
} = require("../services/token.service");
const HttpError = require("../utils/httpError");
const { requireEmail, requirePassword } = require("../utils/validation");

const DEFAULT_NOTIFICATION_DEFAULTS = {
  enabled: true,
  notifyOnEnter: true,
  notifyOnExit: true,
  onlyOnFailure: false,
};

function normalizeNotificationDefaults(input) {
  const source = input && typeof input === "object" ? input : {};
  return {
    enabled:
      source.enabled === undefined
        ? DEFAULT_NOTIFICATION_DEFAULTS.enabled
        : Boolean(source.enabled),
    notifyOnEnter:
      source.notifyOnEnter === undefined
        ? DEFAULT_NOTIFICATION_DEFAULTS.notifyOnEnter
        : Boolean(source.notifyOnEnter),
    notifyOnExit:
      source.notifyOnExit === undefined
        ? DEFAULT_NOTIFICATION_DEFAULTS.notifyOnExit
        : Boolean(source.notifyOnExit),
    onlyOnFailure:
      source.onlyOnFailure === undefined
        ? DEFAULT_NOTIFICATION_DEFAULTS.onlyOnFailure
        : Boolean(source.onlyOnFailure),
  };
}

function sanitizeUser(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    notificationDefaults: normalizeNotificationDefaults(user.notificationDefaults),
    createdAt: user.createdAt,
  };
}

async function register(req, res, next) {
  try {
    const email = requireEmail(req.body.email);
    const password = requirePassword(req.body.password);

    const exists = await User.findOne({ email });
    if (exists) {
      throw new HttpError(409, "Email is already registered", "AUTH_EMAIL_EXISTS");
    }

    const user = new User({ email, role: "user" });
    await user.setPassword(password);
    await user.save();

    const tokens = await issueTokenPair(user);
    res.status(201).json({
      user: sanitizeUser(user),
      ...tokens,
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const email = requireEmail(req.body.email);
    const password = requirePassword(req.body.password);
    const user = await User.findOne({ email });

    if (!user || !(await user.verifyPassword(password))) {
      throw new HttpError(401, "Invalid credentials", "AUTH_INVALID_CREDENTIALS");
    }

    const tokens = await issueTokenPair(user);
    res.json({
      user: sanitizeUser(user),
      ...tokens,
    });
  } catch (error) {
    next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const refreshToken = req.body.refreshToken;
    if (!refreshToken) {
      throw new HttpError(400, "refreshToken is required", "VALIDATION_ERROR");
    }

    const payload = await rotateRefreshToken(refreshToken);
    const user = await User.findById(payload.sub);
    if (!user) {
      throw new HttpError(401, "User not found", "AUTH_USER_NOT_FOUND");
    }

    const tokens = await issueTokenPair(user);
    res.json(tokens);
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    const refreshToken = req.body.refreshToken;
    if (!refreshToken) {
      throw new HttpError(400, "refreshToken is required", "VALIDATION_ERROR");
    }

    await revokeRefreshToken(refreshToken);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

async function me(req, res, next) {
  try {
    const user = await User.findById(req.auth.userId);
    if (!user) {
      throw new HttpError(401, "User not found", "AUTH_USER_NOT_FOUND");
    }

    res.json({
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
}

async function getPreferences(req, res, next) {
  try {
    const user = await User.findById(req.auth.userId);
    if (!user) {
      throw new HttpError(401, "User not found", "AUTH_USER_NOT_FOUND");
    }

    res.json({
      notificationDefaults: normalizeNotificationDefaults(user.notificationDefaults),
    });
  } catch (error) {
    next(error);
  }
}

async function updatePreferences(req, res, next) {
  try {
    const user = await User.findById(req.auth.userId);
    if (!user) {
      throw new HttpError(401, "User not found", "AUTH_USER_NOT_FOUND");
    }

    if (
      req.body?.notificationDefaults !== undefined &&
      (!req.body.notificationDefaults ||
        Array.isArray(req.body.notificationDefaults) ||
        typeof req.body.notificationDefaults !== "object")
    ) {
      throw new HttpError(
        400,
        "notificationDefaults must be an object",
        "VALIDATION_ERROR"
      );
    }

    const incoming = req.body?.notificationDefaults || {};
    const merged = {
      ...normalizeNotificationDefaults(user.notificationDefaults),
      ...incoming,
    };
    user.notificationDefaults = normalizeNotificationDefaults(merged);
    await user.save();

    res.json({
      notificationDefaults: normalizeNotificationDefaults(user.notificationDefaults),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  me,
  getPreferences,
  updatePreferences,
};
