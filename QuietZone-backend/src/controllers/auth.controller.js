const User = require("../models/User");
const {
  issueTokenPair,
  rotateRefreshToken,
  revokeRefreshToken,
} = require("../services/token.service");
const HttpError = require("../utils/httpError");
const { requireEmail, requirePassword } = require("../utils/validation");

function sanitizeUser(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
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

function me(req, res) {
  res.json({
    user: {
      id: req.auth.userId,
      email: req.auth.email,
      role: req.auth.role,
    },
  });
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  me,
};
