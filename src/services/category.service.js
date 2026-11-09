import crypto from "crypto";
import prisma from "../config/prisma.js";

/**
 * ฟังก์ชันสร้าง Slug อัตโนมัติจากชื่อ (รองรับทั้งภาษาไทยและอังกฤษ)
 * เช่น "Smart Phones" -> "smart-phones"
 */
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

/**
 * 1. สร้างหมวดหมู่ใหม่ (Create Category)
 */
export const createCategoryService = async ({ name, slug, image, status }) => {
  const cleanName = name.trim();
  // ถ้ามี slug ส่งมาใช้ค่านั้น ถ้าไม่มีให้ Backend generate ให้จาก name
  const finalSlug = slug?.trim() ? slugify(slug) : slugify(cleanName);

  if (!finalSlug) {
    throw new Error("Invalid category name or slug");
  }

  // เช็คข้อมูลซ้ำทั้ง name และ slug ก่อนบันทึก
  const existing = await prisma.category.findFirst({
    where: {
      OR: [{ name: cleanName }, { slug: finalSlug }],
    },
  });

  if (existing) {
    if (existing.name.toLowerCase() === cleanName.toLowerCase()) {
      throw new Error("Category name already exists");
    }
    throw new Error("Category slug already exists");
  }

  // สร้าง Custom ID ในรูปแบบ cat-xxxxxxxx
  const uniqueId = crypto.randomUUID().slice(0, 8);
  const customId = `cat-${uniqueId}`;

  const newCategory = await prisma.category.create({
    data: {
      id: customId,
      name: cleanName,
      slug: finalSlug,
      image: image || null,
      status: status || "draft",
    },
  });

  return newCategory;
};

/**
 * 2. ดึงรายการหมวดหมู่ทั้งหมด (Get All Categories)
 * รองรับ filter ตาม status และ ค้นหาชื่อ/slug ได้
 */
export const getAllCategoriesService = async ({ status, search } = {}) => {
  const where = {};

  if (status) {
    where.status = status;
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
    ];
  }

  const categories = await prisma.category.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return categories;
};

/**
 * 3. ดึงข้อมูลหมวดหมู่เดี่ยวด้วย ID หรือ Slug (Get Category By Id or Slug)
 */
export const getCategoryByIdService = async (idOrSlug) => {
  const category = await prisma.category.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
  });

  if (!category) {
    throw new Error("Category not found");
  }

  return category;
};

/**
 * 4. แก้ไขหมวดหมู่ (Update Category)
 */
export const updateCategoryService = async (
  id,
  { name, slug, image, status },
) => {
  // ตรวจสอบว่ามีหมวดหมู่นี้อยู่จริงหรือไม่
  const category = await prisma.category.findUnique({
    where: { id },
  });

  if (!category) {
    throw new Error("Category not found");
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
    // ถ้าไม่ได้ส่ง slug มา ให้ auto-generate จากชื่อใหม่
    if (!slug) {
      updateData.slug = slugify(cleanName);
    }
  }

  if (slug !== undefined && slug.trim()) {
    const cleanSlug = slugify(slug);
    const duplicateSlug = await prisma.category.findFirst({
      where: {
        slug: cleanSlug,
        NOT: { id },
      },
    });

    if (duplicateSlug) {
      throw new Error("Category slug already exists");
    }

    updateData.slug = cleanSlug;
  }

  if (images !== undefined) {
    updateData.images = images || null;
  }

  if (status !== undefined) {
    updateData.status = status;
  }

  const updatedCategory = await prisma.category.update({
    where: { id },
    data: updateData,
  });

  return updatedCategory;
};

/**
 * 5. ลบหมวดหมู่ (Delete Category)
 */
export const deleteCategoryService = async (id) => {
  const category = await prisma.category.findUnique({
    where: { id },
  });

  if (!category) {
    throw new Error("Category not found");
  }

  // ในอนาคตเมื่อมีตาราง Product เราจะสามารถเพิ่มเงื่อนไขเช็คว่า
  // ถ้ายังมีสินค้าอยู่ในหมวดหมู่นี้ จะไม่อนุญาตให้ลบได้ตรงนี้

  await prisma.category.delete({
    where: { id },
  });

  return { message: "Category deleted successfully" };
};
