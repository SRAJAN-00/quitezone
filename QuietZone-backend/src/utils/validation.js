const HttpError = require("./httpError");

function requireString(value, fieldName, { min = 1, max = 500 } = {}) {
  if (typeof value !== "string") {
    throw new HttpError(400, `${fieldName} must be a string`, "VALIDATION_ERROR");
  }
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw new HttpError(400, `${fieldName} length must be between ${min} and ${max}`, "VALIDATION_ERROR");
  }
  return trimmed;
}

function requireEmail(value) {
  const email = requireString(value, "email", { min: 5, max: 254 }).toLowerCase();
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!isValid) {
    throw new HttpError(400, "email is invalid", "VALIDATION_ERROR");
  }
  return email;
}

function requirePassword(value) {
  const password = requireString(value, "password", { min: 8, max: 100 });
  return password;
}

function requireNumber(value, fieldName, { min, max } = {}) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new HttpError(400, `${fieldName} must be a valid number`, "VALIDATION_ERROR");
  }
  if (typeof min === "number" && num < min) {
    throw new HttpError(400, `${fieldName} must be >= ${min}`, "VALIDATION_ERROR");
  }
  if (typeof max === "number" && num > max) {
    throw new HttpError(400, `${fieldName} must be <= ${max}`, "VALIDATION_ERROR");
  }
  return num;
}

function requireEnum(value, fieldName, allowedValues) {
  if (!allowedValues.includes(value)) {
    throw new HttpError(400, `${fieldName} must be one of: ${allowedValues.join(", ")}`, "VALIDATION_ERROR");
  }
  return value;
}

module.exports = {
  requireString,
  requireEmail,
  requirePassword,
  requireNumber,
  requireEnum,
};
