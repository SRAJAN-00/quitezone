const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const notificationDefaultsSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: true,
    },
    notifyOnEnter: {
      type: Boolean,
      default: true,
    },
    notifyOnExit: {
      type: Boolean,
      default: true,
    },
    onlyOnFailure: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    notificationDefaults: {
      type: notificationDefaultsSchema,
      default: () => ({
        enabled: true,
        notifyOnEnter: true,
        notifyOnExit: true,
        onlyOnFailure: false,
      }),
    },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.setPassword = async function setPassword(password) {
  this.passwordHash = await bcrypt.hash(password, 10);
};

userSchema.methods.verifyPassword = function verifyPassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

module.exports = mongoose.model("User", userSchema);
