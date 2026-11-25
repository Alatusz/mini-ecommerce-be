import {
  getAllCouponsService,
  getCouponByIdService,
  createCouponService,
  updateCouponService,
  patchCouponStatusService,
  deleteCouponService,
  validateCouponService,
} from "../services/coupon.services.js";

const NOT_FOUND = "Coupon not found";

export const getAllCoupons = async (req, res) => {
  try {
    const result = await getAllCouponsService({
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search || "",
      searchBy: req.query.searchBy || "",
      type: req.query.type || "",
      status: req.query.status || "",
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch coupons",
    });
  }
};

export const getCouponById = async (req, res) => {
  try {
    const coupon = await getCouponByIdService(req.params.id);
    return res.status(200).json({ success: true, data: coupon });
  } catch (error) {
    const code = error.message === NOT_FOUND ? 404 : 400;
    return res.status(code).json({
      success: false,
      message: error.message || "Failed to fetch coupon",
    });
  }
};

export const createCoupon = async (req, res) => {
  try {
    const coupon = await createCouponService(req.body);
    return res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      data: coupon,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create coupon",
    });
  }
};

export const updateCoupon = async (req, res) => {
  try {
    const coupon = await updateCouponService(req.params.id, req.body);
    return res.status(200).json({
      success: true,
      message: "Coupon updated successfully",
      data: coupon,
    });
  } catch (error) {
    const code = error.message === NOT_FOUND ? 404 : 400;
    return res.status(code).json({
      success: false,
      message: error.message || "Failed to update coupon",
    });
  }
};

export const patchCouponStatus = async (req, res) => {
  try {
    const coupon = await patchCouponStatusService(
      req.params.id,
      req.body.status,
    );
    return res.status(200).json({
      success: true,
      message: "Coupon status updated successfully",
      data: coupon,
    });
  } catch (error) {
    const code = error.message === NOT_FOUND ? 404 : 400;
    return res.status(code).json({
      success: false,
      message: error.message || "Failed to update coupon status",
    });
  }
};

export const deleteCoupon = async (req, res) => {
  try {
    await deleteCouponService(req.params.id);
    return res.status(200).json({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (error) {
    const code = error.message === NOT_FOUND ? 404 : 400;
    return res.status(code).json({
      success: false,
      message: error.message || "Failed to delete coupon",
    });
  }
};

export const validateCoupon = async (req, res) => {
  try {
    const data = await validateCouponService(req.body);

    return res.status(200).json({
      success: true,
      message: "Coupon Applied",
      data,
    });
  } catch (error) {
    const code = error.message === NOT_FOUND ? 404 : 400;
    return res.status(code).json({
      success: false,
      message: error.message || "Invalid coupon",
    });
  }
};
