import {
  getShippingRatesService,
  createShippingRateService,
  updateShippingRateService,
} from "../services/shippingRate.service.js";

// Public: Storefront ดึงเฉพาะรายการที่เปิดใช้งาน (isActive = true)
export const getActiveShippingRates = async (req, res) => {
  try {
    const data = await getShippingRatesService({ activeOnly: true });
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch shipping rates",
    });
  }
};

// Admin/Staff: ดึงรายการทั้งหมด (รวมที่ปิดใช้งาน)
export const getAdminShippingRates = async (req, res) => {
  try {
    const data = await getShippingRatesService({ activeOnly: false });
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch shipping rates",
    });
  }
};

// Admin/Staff: สร้างรูปแบบการจัดส่งใหม่
export const createShippingRate = async (req, res) => {
  try {
    const data = await createShippingRateService(req.body);
    return res.status(201).json({
      success: true,
      message: "Shipping rate created successfully",
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create shipping rate",
    });
  }
};

// Admin/Staff: แก้ไขราคา / เงื่อนไขส่งฟรี / เปิด-ปิด
export const updateShippingRate = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await updateShippingRateService(id, req.body);
    return res.status(200).json({
      success: true,
      message: "Shipping rate updated successfully",
      data,
    });
  } catch (error) {
    const statusCode = error.message === "Shipping rate not found" ? 404 : 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update shipping rate",
    });
  }
};
