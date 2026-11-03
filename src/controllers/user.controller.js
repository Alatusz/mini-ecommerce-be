import {
  getProfileService,
  updateProfileService,
  changePasswordService,
} from "../services/user.services.js";

const ERROR_MESSAGE = "User not found";

export const getProfile = async (req, res) => {
  try {
    const userId = req.user?.id || req.params.id;

    const user = await getProfileService(userId);

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    const statusCode = error.message === ERROR_MESSAGE ? 404 : 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to fetch user",
    });
  }
};
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id || req.params.id;
    const { firstName, lastName, phone, bio } = req.body;

    const updateData = await updateProfileService(userId, {
      firstName,
      lastName,
      phone,
      bio,
    });

    return res.status(200).json({
      success: true,
      message: "User Profile updated successfully",
      data: updateData,
    });
  } catch (error) {
    const statusCode = error.message === ERROR_MESSAGE ? 404 : 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update profile",
    });
  }
};
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;

    const { currentPassword, newPassword } = req.body;
    const result = await changePasswordService(userId, {
      currentPassword,
      newPassword,
    });

    return res.status(200).json({
      success: true,
      message: "Password Changed successfully",
      data: result,
    });
  } catch (error) {
    const statusCode = error.message === ERROR_MESSAGE ? 404 : 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update password",
    });
  }
};
