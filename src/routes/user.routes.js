import express from "express";
import {
  getProfile,
  updateProfile,
  changePassword,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  patchUserStatus,
} from "../controllers/user.controller.js";
import { authenticate } from "../services/auth.service.js";

const router = express.Router();

router.use(authenticate)

router.get("/profile",getProfile)
router.put("/profile",updateProfile)
router.put("/change-password",changePassword)

router.get("/", getAllUsers)
router.get("/:id", getUserById)
router.post("/", createUser)
router.put("/:id", updateUser)
router.patch("/:id/status", patchUserStatus)
router.delete("/:id", deleteUser)

export default router;