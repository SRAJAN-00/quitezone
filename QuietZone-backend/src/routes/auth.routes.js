const { Router } = require("express");
const authController = require("../controllers/auth.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

const authRoutes = Router();

authRoutes.post("/register", authController.register);
authRoutes.post("/login", authController.login);
authRoutes.post("/refresh", authController.refresh);
authRoutes.post("/logout", authController.logout);
authRoutes.get("/me", requireAuth, authController.me);
authRoutes.get("/preferences", requireAuth, authController.getPreferences);
authRoutes.patch("/preferences", requireAuth, authController.updatePreferences);

module.exports = authRoutes;
