import {
  getCartService,
  addToCartService,
  updateCartItemQuantityService,
  removeCartItemService,
  clearCartService,
} from "../services/cart.services.js";

const ERROR_MESSAGE = "Cart item not found";

export const getCart = async (req, res) => {
  try {
    const userId = req.user?.id || req.params.id;

    const cart = await getCartService(userId);

    return res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch cart",
    });
  }
};
export const addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity } = req.body;

    const cartItem = await addToCartService(userId, { productId, quantity });

    return res.status(201).json({
      success: true,
      message: "Product added to cart successfully",
      data: cartItem,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to add product to cart",
    });
  }
};

export const updateCartItemQuantity = async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = req.params.itemId;

    const { quantity } = req.body;

    const cartItem = await updateCartItemQuantityService(userId, itemId, {
      quantity,
    });

    return res.status(201).json({
      success: true,
      message: "Product quantity updated successfully",
      data: cartItem,
    });
  } catch (error) {
    const statusCode = error.message === ERROR_MESSAGE ? 404 : 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update quantity",
    });
  }
};

export const removeCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = req.params.itemId;

    const result = await removeCartItemService(userId, itemId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    const statusCode = error.message === ERROR_MESSAGE ? 404 : 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to remove item",
    });
  }
};

export const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await clearCartService(userId);

    return res.status(200).json({
      success: true,
      message: result.message || "Cart cleared successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to clear cart",
    });
  }
};
