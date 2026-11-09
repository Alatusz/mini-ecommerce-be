import crypto from "crypto";
import prisma from "../config/prisma.js";

const VALID_PAYMENT_METHODS = ["cod", "credit_card", "promptpay"];
const VALID_ORDER_STATUSES = [
  "pending",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
];
const VALID_PAYMENT_STATUSES = ["pending", "completed", "failed", "refund"];

/**
 * 1. สร้าง Order จากตะกร้าสินค้า
 */
export const createOrderService = async (
  userId,
  { addressId, paymentMethod = "cod" },
) => {
  if (!addressId) {
    throw new Error("Address ID is required");
  }

  if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
    throw new Error(
      `Invalid payment method. Must be one of: ${VALID_PAYMENT_METHODS.join(", ")}`,
    );
  }

  const address = await prisma.address.findFirst({
    where: { id: addressId, userId },
  });

  if (!address) {
    throw new Error("Address not found");
  }

  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    throw new Error("Cart is empty");
  }

  for (const item of cart.items) {
    if (item.product.status !== "published") {
      throw new Error(`Product "${item.product.name}" is no longer available`);
    }
    if (item.product.stock < item.quantity) {
      throw new Error(
        `Product "${item.product.name}" does not have enough stock (Available: ${item.product.stock})`,
      );
    }
  }

  // คำนวณราคารวมและเตรียมข้อมูล Order Items
  let totalAmount = 0;

  const orderItemsData = cart.items.map((item) => {
    const itemPrice = item.product.sellPrice ?? item.product.originalPrice ?? 0;

    totalAmount += itemPrice * item.quantity;

    return {
      id: `orditem-${crypto.randomUUID().slice(0, 8)}`,
      productId: item.productId,
      price: itemPrice,
      quantity: item.quantity,
    };
  });

  // ทำงานใน Transaction เพื่อความปลอดภัยของข้อมูลและป้องกัน Race Condition
  const newOrder = await prisma.$transaction(async (tx) => {
    for (const item of cart.items) {
      // ดึงข้อมูลสินค้าล่าสุดพร้อมตรวจสอบใน transaction
      const currentProduct = await tx.product.findUnique({
        where: { id: item.productId },
      });

      if (!currentProduct || currentProduct.status !== "published") {
        throw new Error(
          `Product "${item.product.name}" is no longer available`,
        );
      }

      if (currentProduct.stock < item.quantity) {
        throw new Error(
          `Product "${currentProduct.name}" does not have enough stock (Available: ${currentProduct.stock})`,
        );
      }

      // สั่งตัดสต็อกสินค้า
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });
    }

    // สร้าง Order พร้อม Order Items (Nested Create)
    const orderId = `order-${crypto.randomUUID().slice(0, 8)}`;
    const createdOrder = await tx.order.create({
      data: {
        id: orderId,
        userId,
        totalAmount,
        status: "pending",
        paymentMethod,
        paymentStatus: "pending",
        shippingAddress: address.address,
        shippingPhone: address.phone,
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
              },
            },
          },
        },
      },
    });

    // เคลียร์สินค้าออกจากตะกร้า
    await tx.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return createdOrder;
  });

  return newOrder;
};

/**
 * 2. ดูประวัติคำสั่งซื้อของผู้ใช้ปัจจุบัน
 */
export const getMyOrdersService = async (userId) => {
  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              images: true,
              sellPrice: true,
              originalPrice: true,
            },
          },
        },
      },
    },
  });

  return orders;
};

/**
 * 3. ดูรายละเอียดคำสั่งซื้อเดี่ยวตาม ID (ตรวจสอบสิทธิ์ User / Admin)
 */
export const getOrderByIdService = async (userId, orderId, userRole) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  // หากไม่ใช่ Admin หรือ Staff จะดูได้เฉพาะ Order ของตนเองเท่านั้น
  if (userRole !== "admin" && userRole !== "staff" && order.userId !== userId) {
    throw new Error("Unauthorized to access this order");
  }

  return order;
};

/**
 * 4. ลูกค้ายกเลิกคำสั่งซื้อ (คืนสต็อกสินค้าอัตโนมัติ)
 */
export const cancelOrderService = async (userId, orderId) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.userId !== userId) {
    throw new Error("Unauthorized to cancel this order");
  }

  // ยกเลิกได้เฉพาะ Order ที่ยังคงสถานะ pending เท่านั้น
  if (order.status !== "pending") {
    throw new Error(`Cannot cancel order in "${order.status}" status`);
  }

  const cancelledOrder = await prisma.$transaction(async (tx) => {
    // 1. คืนสต็อกสินค้ากลับเข้าสู่คลัง
    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            increment: item.quantity,
          },
        },
      });
    }

    // 2. อัปเดตสถานะคำสั่งซื้อเป็น cancelled
    return await tx.order.update({
      where: { id: orderId },
      data: {
        status: "cancelled",
      },
      include: {
        items: true,
      },
    });
  });

  return cancelledOrder;
};

/**
 * 5. ADMIN: ดึงรายการคำสั่งซื้อทั้งหมดในระบบ
 */
export const getAllOrdersService = async () => {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              images: true,
            },
          },
        },
      },
    },
  });

  return orders;
};

/**
 * 6. ADMIN: อัปเดตสถานะคำสั่งซื้อหรือสถานะการชำระเงิน
 */
export const updateOrderStatusService = async (
  orderId,
  { status, paymentStatus },
) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.status === "cancelled" && status && status !== "cancelled") {
    throw new Error("Cannot change status of an already cancelled order");
  }

  if (status && !VALID_ORDER_STATUSES.includes(status)) {
    throw new Error(
      `Invalid status. Must be one of: ${VALID_ORDER_STATUSES.join(", ")}`,
    );
  }

  if (paymentStatus && !VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
    throw new Error(
      `Invalid paymentStatus. Must be one of: ${VALID_PAYMENT_STATUSES.join(", ")}`,
    );
  }

  // หากเปลี่ยนสถานะเป็น cancelled และสถานะเดิมไม่ใช่ cancelled ให้คืนสต็อกสินค้าด้วย
  if (status === "cancelled" && order.status !== "cancelled") {
    return await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      return await tx.order.update({
        where: { id: orderId },
        data: {
          status: status || undefined,
          paymentStatus: paymentStatus || undefined,
        },
        include: {
          items: true,
        },
      });
    });
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: status || undefined,
      paymentStatus: paymentStatus || undefined,
    },
    include: {
      items: true,
    },
  });

  return updatedOrder;
};
