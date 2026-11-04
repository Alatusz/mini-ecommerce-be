import crypto from "crypto";
import prisma from "../config/prisma.js";

// Helper: ดึงตะกร้า ถ้ายังไม่มีให้สร้างขึ้นมาทันที (1 User มี 1 Cart เสมอ)
const getOrCreateCart = async (userId) => {
  let cart = await prisma.cart.findUnique({
    where: { userId },
  });
  if (!cart) {
    cart = await prisma.cart.create({
      data: {
        id: `cart-${crypto.randomUUID().slice(0, 8)}`,
        userId,
      },
    });
  }
  return cart;
};

export const getCartService = async (userId) => {
  const cart = await getOrCreateCart(userId);

  const cartWithItems = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              originalPrice: true,
              sellPrice: true,
              images: true,
              stock: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  // คำนวณยอดสรุป (Summary)

  const totalItems = cartWithItems.items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  const totalPrice = cartWithItems.items.reduce((sum, item) => {
    const price = item.product.sellPrice ?? item.product.originalPrice ?? 0;

    return sum + price * item.quantity;
  }, 0);

  return {
    ...cartWithItems,
    totalItems,
    totalPrice,
  };
};

export const addToCartService = async (userId, { productId, quantity = 1 }) => {
  const cart = await getOrCreateCart(userId);

  if (!productId) {
    throw new Error("Product ID Not Found");
  }

  if (quantity < 1) {
    throw new Error("Quantity must be at least 1");
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new Error("Product Not Found");
  }

  if (product.status !== "published") {
    throw new Error("Product is not available for sale");
  }

  const existingItem = await prisma.cartItem.findUnique({
    where: {
      cartId_productId: {
        cartId: cart.id,
        productId: productId,
      },
    },
  });

  const totalQuantity = existingItem
    ? existingItem.quantity + quantity
    : quantity;

  if (totalQuantity > product.stock) {
    throw new Error("Not Enough Stock Available");
  }

  let cartItem;

  if (existingItem) {
    cartItem = await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: totalQuantity },
      include: { product: true },
    });
  } else {
    cartItem = await prisma.cartItem.create({
      data: {
        id: `item-${crypto.randomUUID().slice(0, 8)}`,
        cartId: cart.id,
        productId,
        quantity,
      },
      include: { product: true },
    });
  }

  return cartItem;
};

export const updateCartItemQuantityService = async (
  userId,
  itemId,
  { quantity },
) => {
  const cart = await getOrCreateCart(userId);

  const item = await prisma.cartItem.findFirst({
    where: {
      id: itemId,
      cart: { userId },
    },
    include: { product: true },
  });

  if (!item) {
    throw new Error("Cart item not found");
  }

  if (quantity <= 0) {
    await prisma.cartItem.delete({
      where: {
        id: itemId,
      },
    });
    return { message: "Item removed from cart" };
  }

  if (quantity > item.product.stock) {
    throw new Error("Quantity exceeds available stock");
  }

  const updatedItem = await prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity },
    include: { product: true },
  });

  return updatedItem;
};
export const removeCartItemService = async (userId, itemId) => {
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cart: { userId } },
  });

  if (!item) {
    throw new Error("Cart item not found");
  }

  await prisma.cartItem.delete({
    where: { id: itemId },
  });

  return { message: "Item removed from cart" };
};

export const clearCartService = async (userId) => {
  const cart = await prisma.cart.findUnique({
    where: { userId },
  });

  if (!cart) {
    return { message: "Cart is already empty" };
  }

  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id },
  });

  return { message: "Cart cleared successfully" };
};
