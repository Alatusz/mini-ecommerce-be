import express from "express";
import {
  getCart,
  addToCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
} from "../controllers/cart.controller.js";
import { authenticate } from "../services/auth.service.js";

const router = express.Router();

router.use(authenticate);

// 1. ดูตะกร้าสินค้า
router.get("/", getCart);
// 2. เพิ่มสินค้าลงตะกร้า
router.post("/items", addToCart);
// 3. แก้ไขจำนวนสินค้าในตะกร้า
router.put("/items/:itemId", updateCartItemQuantity);
// 4. ลบสินค้า 1 ชิ้นออกจากตะกร้า
router.delete("/items/:itemId", removeCartItem);
// 5. ล้างตะกร้าสินค้าทั้งหมด
router.delete("/", clearCart);

export default router;