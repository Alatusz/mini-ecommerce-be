import {
  getProfileService,
  updateProfileService,
  changePasswordService,
  getAllUsersService,
  getUserByIdService,
  createUserService,
  updateUserService,
  deleteUserService,
  patchUserStatusService,
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

export const getAllUsers = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 10);
    const search = req.query.search || "";
    const searchBy = req.query.searchBy || "";
    const role = req.query.role || "";
    const status = req.query.status || "";

    const result = await getAllUsersService({
      page,
      limit,
      search,
      searchBy,
      role,
      status,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch users",
    });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await getUserByIdService(req.params.id);
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

export const createUser = async (req, res) => {
  try {
    const user = await createUserService(req.body);
    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: user,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create user",
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const user = await updateUserService(req.params.id, req.body);
    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: user,
    });
  } catch (error) {
    const statusCode = error.message === ERROR_MESSAGE ? 404 : 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update user",
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    await deleteUserService(req.params.id);
    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    const statusCode = error.message === ERROR_MESSAGE ? 404 : 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to delete user",
    });
  }
};

export const patchUserStatus = async (req, res) => {
  try {
    const user = await patchUserStatusService(req.params.id, req.body.status);
    return res.status(200).json({
      success: true,
      message: "User status updated successfully",
      data: user,
    });
  } catch (error) {
    const statusCode = error.message === ERROR_MESSAGE ? 404 : 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update user status",
    });
  }
};
