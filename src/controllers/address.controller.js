import {
  getAddressesService,
  addAddressService,
  updateAddressService,
  deleteAddressService,
  setDefaultAddressService,
} from "../services/address.service.js";

const ERROR_NOT_FOUND = "Address not found";

// GET /api/addresses
export const getAddresses = async (req, res) => {
  try {
    const userId = req.user.id;
    const addresses = await getAddressesService(userId);

    return res.status(200).json({
      success: true,
      data: addresses,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to fetch addresses",
    });
  }
};

// POST /api/addresses
export const addAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, tag, address, phone, isDefault } = req.body;

    const newAddress = await addAddressService(userId, {
      title,
      tag,
      address,
      phone,
      isDefault,
    });

    return res.status(201).json({
      success: true,
      message: "Address added successfully",
      data: newAddress,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to add address",
    });
  }
};

// PUT /api/addresses/:id
export const updateAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { title, tag, address, phone, isDefault } = req.body;

    const updated = await updateAddressService(userId, id, {
      title,
      tag,
      address,
      phone,
      isDefault,
    });

    return res.status(200).json({
      success: true,
      message: "Address updated successfully",
      data: updated,
    });
  } catch (error) {
    const statusCode = error.message === ERROR_NOT_FOUND ? 404 : 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update address",
    });
  }
};

// DELETE /api/addresses/:id
export const deleteAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await deleteAddressService(userId, id);

    return res.status(200).json({
      success: true,
      message: result.message || "Address deleted successfully",
    });
  } catch (error) {
    const statusCode = error.message === ERROR_NOT_FOUND ? 404 : 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to delete address",
    });
  }
};

// PATCH /api/addresses/:id/default
export const setDefaultAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await setDefaultAddressService(userId, id);

    return res.status(200).json({
      success: true,
      message: result.message || "Default address updated successfully",
    });
  } catch (error) {
    const statusCode = error.message === ERROR_NOT_FOUND ? 404 : 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to set default address",
    });
  }
};

