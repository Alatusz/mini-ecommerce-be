import {
  createCategoryService,
  getAllCategoriesService,
  getCategoryByIdService,
  updateCategoryService,
  deleteCategoryService,
} from "../services/category.service.js";

/**
 * 1. POST /api/categories - สร้างหมวดหมู่
 */
export const createCategory = async (req, res) => {
  try {
    const { name, slug, image, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const category = await createCategoryService({
      name,
      slug,
      image,
      status,
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create category",
    });
  }
};

/**
 * 2. GET /api/categories - ดึงหมวดหมู่ทั้งหมด
 */
export const getAllCategories = async (req, res) => {
  try {
    const { status, search } = req.query;

    const categories = await getAllCategoriesService({ status, search });

    return res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch categories",
    });
  }
};

/**
 * 3. GET /api/categories/:id - ดึงหมวดหมู่ตาม ID หรือ Slug
 */
export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await getCategoryByIdService(id);

    return res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    const statusCode = error.message === "Category not found" ? 404 : 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to fetch category",
    });
  }
};

/**
 * 4. PUT /api/categories/:id - แก้ไขหมวดหมู่
 */
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, image, status } = req.body;

    const updated = await updateCategoryService(id, {
      name,
      slug,
      image,
      status,
    });

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: updated,
    });
  } catch (error) {
    const statusCode = error.message === "Category not found" ? 404 : 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update category",
    });
  }
};

/**
 * 5. DELETE /api/categories/:id - ลบหมวดหมู่
 */
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await deleteCategoryService(id);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    const statusCode = error.message === "Category not found" ? 404 : 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to delete category",
    });
  }
};

