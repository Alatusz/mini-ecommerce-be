import express from "express";
import {
  getActiveShippingRates,
  getAdminShippingRates,
  createShippingRate,
  updateShippingRate,
} from "../controllers/shippingRate.controller.js";
import { authenticate, authorize } from "../services/auth.service.js";

const router = express.Router();

// Public: Storefront ใช้ดึงตัวเลือกจัดส่งที่เปิดใช้งานอยู่
router.get("/", getActiveShippingRates);

// Admin / Staff: จัดการอัตราค่าจัดส่ง
router.get(
  "/admin",
  authenticate,
  authorize("admin", "staff"),
  getAdminShippingRates,
);
router.post("/", authenticate, authorize("admin", "staff"), createShippingRate);
router.put(
  "/:id",
  authenticate,
  authorize("admin", "staff"),
  updateShippingRate,
);

export default router;
