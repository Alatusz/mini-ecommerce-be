import express from "express";
import {
  getProfile,
  updateProfile,
  changePassword,
} from "../controllers/user.controller.js";
import { authenticate } from "../services/auth.service.js";

const router = express.Router();

router.use(authenticate)

router.get("/profile",getProfile)
router.put("/profile",updateProfile)
router.put("/change-password",changePassword)

export default router;