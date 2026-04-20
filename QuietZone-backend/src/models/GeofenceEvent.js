const mongoose = require("mongoose");

const geofenceEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    zoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
      default: null,
      index: true,
    },
    zoneName: {
      type: String,
      default: "",
    },
    transition: {
      type: String,
      enum: ["enter", "exit"],
      required: true,
    },
    modeApplied: {
      type: String,
      enum: ["silent", "vibrate", "normal", "unknown"],
      default: "unknown",
    },
    previousMode: {
      type: String,
      enum: ["silent", "vibrate", "normal", "unknown"],
      default: "unknown",
    },
    triggeredAt: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("GeofenceEvent", geofenceEventSchema);
