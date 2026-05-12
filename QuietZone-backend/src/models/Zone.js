const mongoose = require("mongoose");

const zoneScheduleSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: false,
    },
    daysOfWeek: {
      type: [Number],
      default: [],
      validate: {
        validator(value) {
          return (
            Array.isArray(value) &&
            value.every(
              (day) => Number.isInteger(day) && day >= 0 && day <= 6
            )
          );
        },
        message: "schedule.daysOfWeek must contain integers from 0 to 6",
      },
    },
    startTime: {
      type: String,
      default: "09:00",
      validate: {
        validator(value) {
          return typeof value === "string" && /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
        },
        message: "schedule.startTime must be HH:mm",
      },
    },
    endTime: {
      type: String,
      default: "17:00",
      validate: {
        validator(value) {
          return typeof value === "string" && /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
        },
        message: "schedule.endTime must be HH:mm",
      },
    },
  },
  { _id: false }
);

const zoneNotificationSchema = new mongoose.Schema(
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
    schedule: {
      type: zoneScheduleSchema,
      default: () => ({
        enabled: false,
        daysOfWeek: [],
        startTime: "09:00",
        endTime: "17:00",
      }),
    },
    notifications: {
      type: zoneNotificationSchema,
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

zoneSchema.index({ center: "2dsphere" });

module.exports = mongoose.model("Zone", zoneSchema);
