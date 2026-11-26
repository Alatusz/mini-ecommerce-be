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
import { authenticate, authorize } from "../services/auth.service.js";

const router = express.Router();

router.use(authenticate);

// USER
router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.put("/change-password", changePassword);

// ADMIN STAFF
router.get("/", authenticate, authorize("admin", "staff"), getAllUsers);
router.get("/:id", authenticate, authorize("admin", "staff"), getUserById);
router.post("/", authenticate, authorize("admin", "staff"), createUser);
router.put("/:id", authenticate, authorize("admin", "staff"), updateUser);
router.patch(
  "/:id/status",
  authenticate,
  authorize("admin", "staff"),
  patchUserStatus,
);
router.delete("/:id", authenticate, authorize("admin", "staff"), deleteUser);

export default router;
