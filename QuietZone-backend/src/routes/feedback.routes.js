const { Router } = require("express");
const feedbackController = require("../controllers/feedback.controller");

const feedbackRoutes = Router();

feedbackRoutes.get("/", feedbackController.listFeedback);
feedbackRoutes.post("/", feedbackController.submitFeedback);

module.exports = feedbackRoutes;
