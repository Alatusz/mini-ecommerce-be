import {
  createOrderService,
  getMyOrdersService,
  getOrderByIdService,
  cancelOrderService,
  getAllOrdersService,
  updateOrderStatusService,
} from "../services/order.services.js";

/**
 * 1. สร้าง Order จากตะกร้าสินค้า
 * POST /api/orders
 */
export const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { addressId, paymentMethod } = req.body;

    const order = await createOrderService(userId, {
      addressId,
      paymentMethod,
    });

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order,
    });
  } catch (error) {
    const statusCode = error.message === "Address not found" ? 404 : 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to create order",
    });
  }
};

/**
 * 2. ดูประวัติคำสั่งซื้อของผู้ใช้ปัจจุบัน
 * GET /api/orders/my-orders
 */
export const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await getMyOrdersService(userId);

    return res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch orders",
    });
  }
};

/**
 * 3. ดูรายละเอียดคำสั่งซื้อเดี่ยวตาม ID
 * GET /api/orders/:id
 */
export const getOrderById = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const orderId = req.params.id;

    const order = await getOrderByIdService(userId, orderId, userRole);

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    let statusCode = 400;
    if (error.message === "Order not found") {
      statusCode = 404;
    } else if (error.message === "Unauthorized to access this order") {
      statusCode = 403;
    }

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to fetch order",
    });
  }
};

/**
 * 4. ลูกค้ายกเลิกคำสั่งซื้อ (เฉพาะสถานะ pending)
 * PUT /api/orders/:id/cancel
 */
export const cancelOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const orderId = req.params.id;

    const order = await cancelOrderService(userId, orderId);

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      data: order,
    });
  } catch (error) {
    let statusCode = 400;
    if (error.message === "Order not found") {
      statusCode = 404;
    } else if (error.message === "Unauthorized to cancel this order") {
      statusCode = 403;
    }

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to cancel order",
    });
  }
};

/**
 * 5. ADMIN/STAFF: ดึงรายการคำสั่งซื้อทั้งหมดในระบบ
 * GET /api/orders หรือ GET /api/orders/admin/all
 */
export const getAllOrders = async (req, res) => {
  try {
    const orders = await getAllOrdersService();

    return res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch all orders",
    });
  }
};

/**
 * 6. ADMIN/STAFF: อัปเดตสถานะคำสั่งซื้อหรือสถานะการชำระเงิน
 * PUT /api/orders/:id/status
 */
export const updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status, paymentStatus } = req.body;

    const order = await updateOrderStatusService(orderId, {
      status,
      paymentStatus,
    });

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: order,
    });
  } catch (error) {
    const statusCode = error.message === "Order not found" ? 404 : 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update order status",
    });
  }
};

