import {
  getStorefrontCategoriesService,
  getStorefrontProductsService,
} from "../services/storefront.service.js";

export const getStorefrontCategories = async (req, res) => {
  try {
    const { limit } = req.query;
    const data = await getStorefrontCategoriesService({ limit });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch storefront categories",
    });
  }
};

export const getStorefrontProducts = async (req, res) => {
  try {
    const {
      search,
      category,
      minPrice,
      maxPrice,
      sort,
      page,
      limit,
    } = req.query;

    const resolvedCategory = category || req.query["category[]"];

    const result = await getStorefrontProductsService({
      search,
      category: resolvedCategory,
      minPrice,
      maxPrice,
      sort,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch storefront products",
    });
  }
};
