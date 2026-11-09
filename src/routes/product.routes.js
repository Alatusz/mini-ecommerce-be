import express from "express";
import {
  getAllProducts,
  getProductIdProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller.js";
import { authenticate, authorize } from "../services/auth.service.js";

const router = express.Router();

/**
 * Public Routes (ใครก็เข้าถึงได้ ไม่ต้อง Login)
 */
router.get("/", getAllProducts);
router.get("/:id", getProductIdProduct);

/**
 * Protected Routes (ต้อง Login และมี Role เป็น Admin หรือ Staff เท่านั้น)
 */

router.post("/", authenticate, authorize("admin", "staff"), createProduct);
router.put("/:id", authenticate, authorize("admin", "staff"), updateProduct);
router.delete("/:id", authenticate, authorize("admin"), deleteProduct);

export default router;
