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

export const computeStockStatus = (stock) => {
  const stockNum = typeof stock === "number" ? stock : Number(stock) || 0;
  if (stockNum <= 0) return "out_of_stock";
  if (stockNum <= 10) return "low_stock";
  return "in_stock";
};

export const getAllProductsService = async ({
  name,
  search,
  searchBy = "all",
  page = 1,
  limit = 10,
  categoryId,
  category,
  status,
  stockStatus,
} = {}) => {
  const where = {};
  const conditions = [];

  // 1. Search Query (ค้นหาตามคอลัมน์ที่เลือก: all, name, sku)
  if (search && search.trim()) {
    const q = search.trim();
    if (searchBy === "name") {
      conditions.push({ name: { contains: q, mode: "insensitive" } });
    } else if (searchBy === "sku" || searchBy === "slug") {
      conditions.push({ slug: { contains: q, mode: "insensitive" } });
    } else {
      conditions.push({
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
        ],
      });
    }
  }

  // 2. Status Filter (สถานะการเผยแพร่: draft, published, archived)
  if (status) {
    const statusList = Array.isArray(status)
      ? status
      : typeof status === "string"
        ? status
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
        : [];

    const publishStatuses = [];
    const legacyStockConditions = [];

    statusList.forEach((st) => {
      if (["draft", "published", "archived"].includes(st)) {
        publishStatuses.push(st);
      } else if (["in_stock", "in stock", "instock"].includes(st)) {
        legacyStockConditions.push({ stock: { gt: 10 } });
      } else if (["low_stock", "low stock", "lowstock"].includes(st)) {
        legacyStockConditions.push({ stock: { gt: 0, lte: 10 } });
      } else if (["out_of_stock", "out of stock", "outofstock"].includes(st)) {
        legacyStockConditions.push({ stock: { lte: 0 } });
      }
    });

    if (publishStatuses.length === 1) {
      conditions.push({ status: publishStatuses[0] });
    } else if (publishStatuses.length > 1) {
      conditions.push({ status: { in: publishStatuses } });
    }

    if (legacyStockConditions.length === 1) {
      conditions.push(legacyStockConditions[0]);
    } else if (legacyStockConditions.length > 1) {
      conditions.push({ OR: legacyStockConditions });
    }
  }

  // 3. Stock Status Filter (สถานะคลังสินค้า: in_stock, low_stock, out_of_stock)
  if (stockStatus) {
    const stockList = Array.isArray(stockStatus)
      ? stockStatus
      : typeof stockStatus === "string"
        ? stockStatus
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
        : [];

    const stockConditions = [];
    stockList.forEach((st) => {
      if (["in_stock", "in stock", "instock"].includes(st)) {
        stockConditions.push({ stock: { gt: 10 } });
      } else if (["low_stock", "low stock", "lowstock"].includes(st)) {
        stockConditions.push({ stock: { gt: 0, lte: 10 } });
      } else if (["out_of_stock", "out of stock", "outofstock"].includes(st)) {
        stockConditions.push({ stock: { lte: 0 } });
      }
    });

    if (stockConditions.length === 1) {
      conditions.push(stockConditions[0]);
    } else if (stockConditions.length > 1) {
      conditions.push({ OR: stockConditions });
    }
  }

  // 3. Category Filter (รองรับทั้ง Array และ Comma-separated string เช่น "cat-1,cat-2")
  const rawCat = category || categoryId;
  if (rawCat) {
    const catList = Array.isArray(rawCat)
      ? rawCat
      : typeof rawCat === "string"
        ? rawCat
            .split(",")
            .map((c) => c.trim())
            .filter((c) => c && c.toLowerCase() !== "all")
        : [];

    if (catList.length === 1) {
      conditions.push({
        OR: [
          { categoryId: catList[0] },
          { categories: { slug: catList[0] } },
          { categories: { name: { equals: catList[0], mode: "insensitive" } } },
        ],
      });
    } else if (catList.length > 1) {
      conditions.push({
        OR: [
          { categoryId: { in: catList } },
          { categories: { slug: { in: catList } } },
          { categories: { name: { in: catList, mode: "insensitive" } } },
        ],
      });
    }
  }

  if (name) {
    conditions.push({ name: { contains: name, mode: "insensitive" } });
  }

  // รวมเงื่อนไขทั้งหมดด้วย AND เพื่อไม่ให้เงื่อนไขทับซ้อนกัน
  if (conditions.length > 0) {
    where.AND = conditions;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  // ดึงข้อมูลสินค้า พร้อมคำนวณสถิติ KPI ทั้งหมดตรงจาก Database ด้วย Promise.all
  const [
    products,
    total,
    stockSumAgg,
    inStockCount,
    lowStockCount,
    outOfStockCount,
  ] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limitNum,
      include: {
        categories: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.count({ where }),
    prisma.product.aggregate({
      _sum: { stock: true },
    }),
    prisma.product.count({
      where: { stock: { gt: 10 } },
    }),
    prisma.product.count({
      where: { stock: { gt: 0, lte: 10 } },
    }),
    prisma.product.count({
      where: { stock: { lte: 0 } },
    }),
  ]);

  const totalUnits = stockSumAgg._sum.stock || 0;
  const totalPages = Math.ceil(total / limitNum);

  const formattedProducts = products.map((prod) => ({
    id: prod.id,
    name: prod.name,
    sku: prod.slug ? prod.slug.toUpperCase() : prod.id,
    description: prod.description || null,
    originalPrice: prod.originalPrice,
    sellPrice: prod.sellPrice,
    stock: prod.stock,
    stockStatus: computeStockStatus(prod.stock),
    status: prod.status,
    images: prod.images || [],
    categories: prod.categories ? [prod.categories] : [],
    createdAt: prod.createdAt,
    updatedAt: prod.updatedAt,
  }));

  return {
    products: formattedProducts,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages,
    stats: {
      totalSKUs: total,
      totalUnits,
      inStockCount,
      lowStockCount,
      outOfStockCount,
    },
  };
};
export const getProductByIdService = async (id) => {
  const product = await prisma.product.findFirst({
    where: {
      OR: [{ id: id }, { slug: id }],
    },
    include: {
      categories: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  return {
    id: product.id,
    name: product.name,
    sku: product.slug ? product.slug.toUpperCase() : product.id,
    description: product.description || null,
    originalPrice: product.originalPrice,
    sellPrice: product.sellPrice,
    stock: product.stock,
    stockStatus: computeStockStatus(product.stock),
    images: product.images || [],
    status: product.status,
    categories: product.categories ? [product.categories] : [],
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
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
