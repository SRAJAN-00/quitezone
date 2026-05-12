const Feedback = require("../models/Feedback");
const { requireNumber, requireString } = require("../utils/validation");

function toFeedbackResponse(feedback) {
  return {
    id: feedback._id.toString(),
    userId: feedback.userId?._id ? feedback.userId._id.toString() : feedback.userId.toString(),
    userEmail: feedback.userId?.email || null,
    rating: feedback.rating,
    comment: feedback.comment,
    createdAt: feedback.createdAt,
    updatedAt: feedback.updatedAt,
  };
}

async function submitFeedback(req, res, next) {
  try {
    const rating = requireNumber(req.body.rating, "rating", { min: 1, max: 5 });
    const comment = requireString(req.body.comment, "comment", { min: 5, max: 1000 });

    const feedback = await Feedback.create({
      userId: req.auth.userId,
      rating: Math.round(rating),
      comment,
    });

    res.status(201).json({
      feedback: toFeedbackResponse(feedback),
    });
  } catch (error) {
    next(error);
  }
}

async function listFeedback(req, res, next) {
  try {
    const isAdmin = req.auth.role === "admin";
    const query = isAdmin ? {} : { userId: req.auth.userId };

    const feedback = await Feedback.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("userId", "email")
      .lean();

    res.json({
      feedback: feedback.map(toFeedbackResponse),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  submitFeedback,
  listFeedback,
};
