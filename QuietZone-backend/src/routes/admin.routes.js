const { Router } = require("express");
const adminController = require("../controllers/admin.controller");

const adminRoutes = Router();

adminRoutes.get("/overview", adminController.getOverview);
adminRoutes.get("/users", adminController.listUsers);
adminRoutes.patch("/users/:userId/role", adminController.updateUserRole);

module.exports = adminRoutes;
