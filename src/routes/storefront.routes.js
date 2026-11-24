import express from "express";
import {
  getStorefrontCategories,
  getStorefrontProducts,
} from "../controllers/storefront.controller.js";

const router = express.Router();

router.get("/categories", getStorefrontCategories);
router.get("/products", getStorefrontProducts);

export default router;
