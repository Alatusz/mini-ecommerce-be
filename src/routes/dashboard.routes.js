import express from "express";
import { getDashboardOverview } from "../controllers/dashboard.controller.js";
import { authenticate, authorize } from "../services/auth.service.js";

const router = express.Router();
/**
 * Protected Routes (ต้อง Login และมี Role เป็น Admin หรือ Staff เท่านั้น)
 */
router.get(
  "/",
  authenticate,
  authorize("admin", "staff"),
  getDashboardOverview,
);

export default router;
