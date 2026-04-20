const mongoose = require("mongoose");

const zoneSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    center: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator(value) {
            return (
              Array.isArray(value) &&
              value.length === 2 &&
              Number.isFinite(value[0]) &&
              Number.isFinite(value[1]) &&
              value[0] >= -180 &&
              value[0] <= 180 &&
              value[1] >= -90 &&
              value[1] <= 90
            );
          },
          message: "center.coordinates must be [lng, lat]",
        },
      },
    },
    radiusMeters: {
      type: Number,
      required: true,
      min: 50,
    },
    targetMode: {
      type: String,
      enum: ["silent", "vibrate"],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

zoneSchema.index({ center: "2dsphere" });

module.exports = mongoose.model("Zone", zoneSchema);
