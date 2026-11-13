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
 * 2. ดึงรายการหมวดหมู่ (Get Categories with Pagination & Search)
 * รองรับ filter ตาม status, ค้นหาชื่อ/slug, และแบ่งหน้า (Server-side)
 */
export const getAllCategoriesService = async ({
  search,
  page = 1,
  limit = 10,
  status,
} = {}) => {
  // ── 1. กำหนดเงื่อนไขการค้นหา (Where Clause) ──
  const where = {};

  // รองรับ status แบบ Array หรือ Comma-separated (เช่น active,draft)
  if (status) {
    const statusList = Array.isArray(status)
      ? status
      : typeof status === "string"
        ? status
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
        : [];

    if (statusList.length === 1) {
      where.status = statusList[0];
    } else if (statusList.length > 1) {
      where.status = { in: statusList };
    }
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
    ];
  }

  // ── 2. คำนวณการแบ่งหน้า (Pagination Math) ──
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 10;
  const skip = (pageNum - 1) * limitNum;

  // ── 3. Query ข้อมูลและนับจำนวนทั้งหมดพร้อมกัน ──
  const [categories, total] = await Promise.all([
    prisma.category.findMany({
      where,
      skip,
      take: limitNum,
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limitNum);

  // ── 4. จัดรูปแบบข้อมูลให้กระชับและเรียงลำดับชัดเจน ──
  const formattedCategories = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    image: cat.image,
    status: cat.status,
    productCount: cat._count?.products || 0,
    createdAt: cat.createdAt,
    updatedAt: cat.updatedAt,
  }));

  return {
    categories: formattedCategories,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages,
  };
};

/**
 * 3. ดึงข้อมูลหมวดหมู่เดี่ยวด้วย ID หรือ Slug (Get Category By Id or Slug)
 */
export const getCategoryByIdService = async (idOrSlug) => {
  const category = await prisma.category.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  if (!category) {
    throw new Error("Category not found");
  }

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    image: category.image,
    status: category.status,
    productCount: category._count?.products || 0,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
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

  // หากมีการพยายามปรับสถานะเป็น draft หรือ archived
  // ตรวจสอบว่ามีสินค้าผูกอยู่หรือไม่ ถ้ามีห้ามเปลี่ยนสถานะ
  if (status !== undefined && status !== "active") {
    const productCount = await prisma.product.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      throw new Error(
        `Cannot change category status to ${status}. It is currently linked to ${productCount} product(s).`,
      );
    }
  }

  const updateData = {};

  if (name !== undefined) {
    const cleanName = name.trim();

    const duplicateName = await prisma.category.findFirst({
      where: {
        name: cleanName,
        NOT: { id },
      },
    });

    if (duplicateName) {
      throw new Error("Category name already exists");
    }
    updateData.name = cleanName;
    // ถ้าไม่ได้ส่ง slug มา ให้ auto-generate จากชื่อใหม่
    if (!slug?.trim() && cleanName !== category.name) {
      const generatedSlug = slugify(cleanName);
      if (!generatedSlug) {
        throw new Error("Invalid category name");
      }

      const duplicateSlug = await prisma.category.findFirst({
        where: {
          slug: generatedSlug,
          NOT: { id },
        },
      });

      if (duplicateSlug) {
        throw new Error("Category slug already exists");
      }

      updateData.slug = generatedSlug;
    }
  }

  if (slug !== undefined && slug.trim()) {
    const cleanSlug = slugify(slug);
    if (!cleanSlug) {
      throw new Error("Invalid category slug");
    }

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

  if (image !== undefined) {
    updateData.image = image || null;
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

  const productCount = await prisma.product.count({
    where: { categoryId: id },
  });

  if (productCount > 0) {
    throw new Error(
      `Cannot delete category. It currently has ${productCount} product(s) assigned to it.`,
    );
  }

  await prisma.category.delete({
    where: { id },
  });

  return { message: "Category deleted successfully" };
};

/**
 * 6. อัปเดตเฉพาะสถานะของหมวดหมู่ (Patch Category Status)
 */
export const patchCategoryStatusService = async (id, status) => {
  const allowedStatuses = ["active", "archived", "draft"];
  if (!allowedStatuses.includes(status)) {
    throw new Error(
      `Invalid status. Allowed values: ${allowedStatuses.join(", ")}`,
    );
  }

  const category = await prisma.category.findUnique({
    where: { id },
  });

  if (!category) {
    throw new Error("Category not found");
  }

  // หากมีการพยายามปรับสถานะเป็น draft หรือ archived
  // ตรวจสอบว่ามีสินค้าผูกอยู่หรือไม่ ถ้ามีห้ามเปลี่ยนสถานะ
  if (status !== "active") {
    const productCount = await prisma.product.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      throw new Error(
        `Cannot change category status to ${status}. It is currently linked to ${productCount} product(s).`,
      );
    }
  }

  const updatedCategory = await prisma.category.update({
    where: { id },
    data: { status },
  });

  return updatedCategory;
};

/**
 * 7. ดึงตัวเลือกหมวดหมู่สำหรับใส่ Dropdown / Select ({feature}Options)
 * ดึงเฉพาะหมวดหมู่ที่ active, ส่งเฉพาะ id, name และเรียงตามชื่อ ก-ฮ / A-Z
 */
export const getCategoryOptionsService = async ({ limit } = {}) => {
  const limitNum = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : undefined;
  const categories = await prisma.category.findMany({
    where: {
      status: "active",
    },
    take: limitNum,
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return categories;
};
