import express from "express";
import { logout, register, login, getMe } from "../controllers/auth.controller.js";
import { authenticate } from "../services/auth.service.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

// Protected Route (ต้อง Login ก่อน)
// router.get("/", authenticate, (req, res) => {
//   res.json({
//     success: true,
//     message: "ข้อมูลผู้ใช้งานปัจจุบัน",
//     user: req.user,
//   });
// });

// router.get(
//   "/",
//   authenticate,
//   authorize("admin", "staff"),
//   (req, res) => {
//     res.json({
//       success: true,
//       message: `ยินดีต้อนรับสู่แดชบอร์ด คุณ ${req.user.email} (Role: ${req.user.role})`,
//     });
//   },
// );

router.get("/me", authenticate, getMe);

router.post("/logout", logout);

export default router;
