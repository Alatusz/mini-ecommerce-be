import crypto from "crypto";
import prisma from "../config/prisma.js";

export const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // แทนที่ช่องว่างด้วยขีด (-)
    .replace(/[^a-z0-9\-ก-๙]+/g, "") // ลบอักขระพิเศษ แต่ยังเก็บภาษาไทยและอังกฤษไว้
    .replace(/\-\-+/g, "-") // แทนที่ขีดซ้ำๆ ให้เหลือขีดเดียว
    .replace(/^-+/, "") // ตัดขีดหน้าสุด
    .replace(/-+$/, ""); // ตัดขีดหลังสุด
};

export const getAllProductsService = async ({ name, search } = {}) => {
  const where = {};

  if (name) {
    where.name = name;
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [{ name: { contains: q, mode: "insensitive" } }];
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return products;
};
export const getProductByIdService = async (id) => {
  const product = await prisma.product.findFirst({
    where: {
      OR: [{ id: id }, { slug: id }],
    },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  return product;
};
export const createProductService = async ({
  name,
  slug,
  description,
  originalPrice,
  sellPrice,
  stock,
  images,
  status,
  categoryId,
}) => {
  const cleanName = name.trim();

  const finalSlug = slug?.trim() ? slugify(slug) : slugify(cleanName);

  if (!finalSlug) {
    throw new Error("Invalid Product name or slug");
  }

  const existing = await prisma.product.findFirst({
    where: {
      OR: [{ name: cleanName }, { slug: finalSlug }],
    },
  });

  if (existing) {
    if (existing.name.toLowerCase() === cleanName.toLowerCase()) {
      throw new Error("Product name already exists");
    }
    throw new Error("Product slug already exists");
  }

  const categoryExists = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!categoryExists) {
    throw new Error("Category not found");
  }

  const uniqueId = crypto.randomUUID().slice(0, 8);
  const customId = `prod-${uniqueId}`;

  const newProduct = await prisma.product.create({
    data: {
      id: customId,
      name: cleanName,
      slug: finalSlug,
      description: description || null,
      originalPrice: originalPrice,
      sellPrice: sellPrice || null,
      stock: stock || 0,
      images: images || [],
      status: status || "draft",
      categoryId: categoryId || null,
    },
  });

  return newProduct;
};
export const updateProductService = async (
  id,
  {
    name,
    slug,
    description,
    originalPrice,
    sellPrice,
    stock,
    images,
    status,
    categoryId,
  },
) => {
  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    throw new Error("Prodcut not found");
  }

  const updateData = {};

  if (name !== undefined) {
    const cleanName = name.trim();

    const duplicateName = await prisma.product.findFirst({
      where: {
        name: cleanName,
        NOT: { id },
      },
    });

    if (duplicateName) {
      throw new Error("Product name already exists");
    }

    updateData.name = cleanName;

    if (!slug) {
      updateData.slug = slugify(cleanName);
    }
  }

  if (slug !== undefined && slug.trim()) {
    const cleanSlug = slugify(slug);
    const duplicateSlug = await prisma.product.findFirst({
      where: {
        slug: cleanSlug,
        NOT: { id },
      },
    });

    if (duplicateSlug) {
      throw new Error("Product slug already exists");
    }

    updateData.slug = cleanSlug;
  }

  if (images !== undefined) {
    updateData.images = images || [];
  }

  if (status !== undefined) {
    updateData.status = status || "draft";
  }

  if (description !== undefined) {
    updateData.description = description || null;
  }
  if (originalPrice !== undefined) {
    updateData.originalPrice = originalPrice;
  }
  if (sellPrice !== undefined) {
    updateData.sellPrice = sellPrice;
  }
  if (stock !== undefined) {
    updateData.stock = stock;
  }

  if (categoryId !== undefined) {
    // ต้องเช็คก่อนเสมอว่าหมวดหมู่ใหม่ที่ย้ายไป มีอยู่จริงไหม
    const categoryExists = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!categoryExists) throw new Error("Category not found");

    updateData.categoryId = categoryId;
  }

  const updateProduct = await prisma.product.update({
    where: { id },
    data: updateData,
  });

  return updateProduct;
};
export const deleteProductService = async (id) => {
  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  await prisma.product.delete({
    where: { id },
  });

  return { message: "Product deleted successfully" };
};
