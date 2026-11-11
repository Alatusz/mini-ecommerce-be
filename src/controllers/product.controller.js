import {
  getAllProductsService,
  getProductByIdService,
  createProductService,
  updateProductService,
  deleteProductService,
} from "../services/product.services.js";

export const createProduct = async (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      originalPrice,
      sellPrice,
      stock,
      images,
      status,
      category,
      categoryId,
    } = req.body;

    const finalCategoryId = categoryId || category;

    if (!name || !name.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Product name is required" });
    }
    if (sellPrice === undefined || sellPrice === null) {
      return res
        .status(400)
        .json({ success: false, message: "Sell price is required" });
    }
    if (!finalCategoryId) {
      return res
        .status(400)
        .json({ success: false, message: "Category ID is required" });
    }

    const product = await createProductService({
      name,
      slug,
      description,
      originalPrice: originalPrice ? Number(originalPrice) : null,
      sellPrice: Number(sellPrice),
      stock: stock !== undefined ? Number(stock) : 0,
      images,
      status,
      categoryId: finalCategoryId,
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create product",
    });
  }
};
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      slug,
      description,
      originalPrice,
      sellPrice,
      stock,
      images,
      status,
      categoryId,
      category,
    } = req.body;

    const updated = await updateProductService(id, {
      name,
      slug,
      description,
      originalPrice,
      sellPrice,
      stock,
      images,
      status,
      categoryId: categoryId || category,
    });

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updated,
    });
  } catch (error) {
    const statusCode = error.message === "Product not found" ? 404 : 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update product",
    });
  }
};
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await deleteProductService(id);

    return res.status(200).json({
      success: true,
      data: result.message,
    });
  } catch (error) {
    const statusCode = error.message === "Product not found" ? 404 : 400;

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to delete product",
    });
  }
};
export const getAllProducts = async (req, res) => {
  try {
    const {
      name,
      search,
      searchBy,
      page,
      limit,
      categoryId,
      category,
      status,
      stockStatus,
    } = req.query;

    const result = await getAllProductsService({
      name,
      search,
      searchBy,
      page,
      limit,
      category: category || categoryId,
      status,
      stockStatus,
    });

    return res.status(200).json({
      success: true,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      stats: result.stats,
      data: result.products,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch products",
    });
  }
};
export const getProductIdProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await getProductByIdService(id);

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    const statusCode = error.message === "Category not found" ? 404 : 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to fetch category",
    });
  }
};
