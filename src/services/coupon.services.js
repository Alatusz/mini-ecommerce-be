import prisma from "../config/prisma.js";

const parseCsvList = (val) =>
  Array.isArray(val)
    ? val
    : typeof val === "string"
      ? val.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
      : [];

export const getAllCouponsService = async ({
  page = 1,
  limit = 10,
  search = "",
  searchBy = "",
  type = "",
  status = "",
} = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 10;
  const skip = (pageNum - 1) * limitNum;
  const where = {};

  const types = parseCsvList(type).filter((t) =>
    ["percent", "fixed"].includes(t)
  );
  if (types.length > 0) where.discountType = { in: types };

  const statuses = parseCsvList(status).filter((s) =>
    ["active", "scheduled", "expired", "disabled"].includes(s)
  );
  if (statuses.length > 0) where.status = { in: statuses };

  if (search && search.trim()) {
    const q = search.trim();
    const targets = parseCsvList(searchBy);
    if (targets.length === 1 && targets[0] === "code") {
      where.code = { contains: q, mode: "insensitive" };
    } else if (targets.length === 1 && targets[0] === "description") {
      where.description = { contains: q, mode: "insensitive" };
    } else {
      where.OR = [
        { code: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }
  }

  const [total, statusGroups, coupons] = await Promise.all([
    prisma.coupon.count({ where }),
    prisma.coupon.groupBy({
      by: ["status"],
      _count: { id: true },
      _sum: { usageCount: true },
    }),
    prisma.coupon.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const summaryByStatus = statusGroups.map((g) => ({
    status: g.status,
    count: g._count.id,
    redemptions: Number(g._sum.usageCount ?? 0),
  }));

  return { total, summaryByStatus, coupons };
};

export const getCouponByIdService = async (id) => {
  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) throw new Error("Coupon not found");
  return coupon;
};

export const createCouponService = async ({
  code,
  description,
  discountType = "percent",
  discountValue,
  minSpend = 0,
  usageLimit = null,
  startDate,
  expiredDate,
  status = "active",
}) => {
  const normalizedCode = code.trim().toUpperCase();
  const existing = await prisma.coupon.findUnique({
    where: { code: normalizedCode },
  });
  if (existing) throw new Error("Coupon code already exists");

  return prisma.coupon.create({
    data: {
      code: normalizedCode,
      description: description || null,
      discountType,
      discountValue: Number(discountValue),
      minSpend: Number(minSpend) || 0,
      usageLimit: usageLimit ? Number(usageLimit) : null,
      startDate: new Date(startDate),
      expiredDate: new Date(expiredDate),
      status,
    },
  });
};

export const updateCouponService = async (id, data) => {
  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) throw new Error("Coupon not found");

  return prisma.coupon.update({
    where: { id },
    data: {
      ...(data.code !== undefined && { code: data.code.trim().toUpperCase() }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.discountType !== undefined && { discountType: data.discountType }),
      ...(data.discountValue !== undefined && {
        discountValue: Number(data.discountValue),
      }),
      ...(data.minSpend !== undefined && { minSpend: Number(data.minSpend) }),
      ...(data.usageLimit !== undefined && {
        usageLimit: data.usageLimit ? Number(data.usageLimit) : null,
      }),
      ...(data.startDate !== undefined && {
        startDate: new Date(data.startDate),
      }),
      ...(data.expiredDate !== undefined && {
        expiredDate: new Date(data.expiredDate),
      }),
      ...(data.status !== undefined && { status: data.status }),
    },
  });
};

export const patchCouponStatusService = async (id, status) => {
  if (!["active", "scheduled", "expired", "disabled"].includes(status)) {
    throw new Error("Invalid status");
  }
  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) throw new Error("Coupon not found");

  return prisma.coupon.update({
    where: { id },
    data: { status },
  });
};

export const deleteCouponService = async (id) => {
  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) throw new Error("Coupon not found");
  await prisma.coupon.delete({ where: { id } });
  return { id };
};
