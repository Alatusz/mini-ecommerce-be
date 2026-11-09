import express from "express";
import {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
} from "../controllers/order.controller.js";
import { authenticate, authorize } from "../services/auth.service.js";

const router = express.Router();

// ทุก Route เกี่ยวข้องกับคำสั่งซื้อ ต้องเข้าสู่ระบบ (Login) ก่อนเสมอ
router.use(authenticate);

/**
 * Customer Routes
 */
// 1. สร้าง Order จากตะกร้าสินค้า
router.post("/", createOrder);

// 2. ดูประวัติคำสั่งซื้อของตนเอง (วางก่อน /:id เพื่อป้องกันการมองเห็น my-orders เป็น parameter id)
router.get("/my-orders", getMyOrders);

// 3. ดูรายละเอียดคำสั่งซื้อเดี่ยวตาม ID (ทั้ง User เจ้าของออเดอร์ และ Admin/Staff)
router.get("/:id", getOrderById);

// 4. ยกเลิกคำสั่งซื้อ (เฉพาะสถานะ pending)
router.put("/:id/cancel", cancelOrder);
router.patch("/:id/cancel", cancelOrder);

/**
 * Admin / Staff Protected Routes
 */
// 5. ดูรายการคำสั่งซื้อทั้งหมดในระบบ (รองรับทั้ง GET /api/orders และ GET /api/orders/admin/all)
router.get("/", authorize("admin", "staff"), getAllOrders);
router.get("/admin/all", authorize("admin", "staff"), getAllOrders);

// 6. อัปเดตสถานะคำสั่งซื้อหรือสถานะการชำระเงิน
router.put("/:id/status", authorize("admin", "staff"), updateOrderStatus);
router.patch("/:id/status", authorize("admin", "staff"), updateOrderStatus);

export default router;

