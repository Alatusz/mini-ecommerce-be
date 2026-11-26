import prisma from "../config/prisma.js";

/**
 * Storefront: ดึงหมวดหมู่ที่เปิดใช้งาน (active) เฉพาะฟิลด์ที่จำเป็น
 */
export const getStorefrontCategoriesService = async ({ limit = 50 } = {}) => {
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

  const categories = await prisma.category.findMany({
    where: { status: "active" },
    take: limitNum,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      image: true,
      _count: {
        select: {
          products: {
            where: { status: "published" },
          },
        },
      },
    },
  });

  return categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    image: cat.image,
    productCount: cat._count.products,
  }));
};

/**
 * Storefront: ดึงรายการสินค้าที่เผยแพร่ (published) เฉพาะฟิลด์ที่จำเป็น
 * รองรับ search, category, minPrice, maxPrice, sort, page, limit
 */
export const getStorefrontProductsService = async ({
  search,
  category,
  minPrice,
  maxPrice,
  sort = "newest",
  page = 1,
  limit = 15,
} = {}) => {
  const conditions = [{ status: "published" }];

  if (search && search.trim()) {
    conditions.push({
      name: { contains: search.trim(), mode: "insensitive" },
    });
  }

  if (category) {
    const categoryList = Array.isArray(category)
      ? category
      : typeof category === "string"
        ? category
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean)
        : [];

    if (categoryList.length === 1) {
      conditions.push({ categoryId: categoryList[0] });
    } else if (categoryList.length > 1) {
      conditions.push({ categoryId: { in: categoryList } });
    }
  }

  const minP = minPrice !== undefined && minPrice !== "" ? Number(minPrice) : null;
  const maxP = maxPrice !== undefined && maxPrice !== "" ? Number(maxPrice) : null;

  if (minP !== null && !Number.isNaN(minP)) {
    conditions.push({ sellPrice: { gte: minP } });
  }
  if (maxP !== null && !Number.isNaN(maxP)) {
    conditions.push({ sellPrice: { lte: maxP } });
  }

  const where = { AND: conditions };

  let orderBy = { createdAt: "desc" };
  if (sort === "price-asc") orderBy = { sellPrice: "asc" };
  else if (sort === "price-desc") orderBy = { sellPrice: "desc" };
  else if (sort === "name") orderBy = { name: "asc" };

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));
  const skip = (pageNum - 1) * limitNum;

  const [products] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limitNum,
      orderBy,
      select: {
        id: true,
        name: true,
        slug: true,
        sellPrice: true,
        stock: true,
        images: true,
        categories: {
          select: { id: true, name: true, slug: true },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const data = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    sellPrice: p.sellPrice,
    stock: p.stock,
    image: p.images?.[0] || null,
    category: p.categories || null,
  }));

  return {
    data,
  };
};
