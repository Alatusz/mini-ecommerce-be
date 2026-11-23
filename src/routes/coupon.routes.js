import express from "express";
import {
  getAllCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  patchCouponStatus,
  deleteCoupon,
} from "../controllers/coupon.controller.js";
import { authenticate, authorize } from "../services/auth.service.js";

const router = express.Router();

router.use(authenticate, authorize("admin", "staff"));

router.get("/", getAllCoupons);
router.get("/:id", getCouponById);
router.post("/", createCoupon);
router.put("/:id", updateCoupon);
router.patch("/:id/status", patchCouponStatus);
router.delete("/:id", deleteCoupon);

export default router;
