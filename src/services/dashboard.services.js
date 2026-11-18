import prisma from "../config/prisma.js";
import { buildUtcDateRange } from "../utils/dateRange.js";
import { DateTime } from "luxon";

const DATE_FORMAT_BY_GROUP = {
  hour: "yyyy-MM-dd HH:00",
  day: "yyyy-MM-dd",
  month: "yyyy-MM",
  year: "yyyy",
};

export const getDashboardOverviewService = async ({
  startDate,
  endDate,
  tz,
  groupBy = "day",
}) => {
  const { start, end, zone } = buildUtcDateRange(startDate, endDate, tz);

  const createdAtRange = {
    gte: start,
    lte: end,
  };

  const dateFormat = DATE_FORMAT_BY_GROUP[groupBy] || DATE_FORMAT_BY_GROUP.day;

  const [
    orderSummaryAgg,
    newCustomerCount,
    ordersInRange,
    orderItemsInRange,
    recentOrders,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { createdAt: createdAtRange, status: { not: "cancelled" } },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
    prisma.user.count({
      where: { role: "customer", createdAt: createdAtRange },
    }),
    prisma.order.findMany({
      where: { createdAt: createdAtRange, status: { not: "cancelled" } },
      select: { createdAt: true, totalAmount: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: createdAtRange,
          status: { not: "cancelled" },
        },
      },
      select: {
        price: true,
        quantity: true,
        product: {
          select: {
            id: true,
            name: true,
            images: true,
            categories: {
              select: { id: true, name: true },
            },
          },
        },
      },
    }),
    prisma.order.findMany({
      take: 5,
      where: { createdAt: createdAtRange },
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.findMany({
      take: 5,
      where: { createdAt: createdAtRange },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // รายได้ทั้งหมด
  const revenue = Number(orderSummaryAgg._sum.totalAmount ?? 0);
  // จำนวนออเดอร์
  const ordersCount = orderSummaryAgg._count.id ?? 0;
  //
  const aov = ordersCount > 0 ? Math.round(revenue / ordersCount) : 0;

  // Sale Trend Graph
  const salesTrendByPeriod = {};

  ordersInRange.forEach((order) => {
    const periodKey = DateTime.fromJSDate(order.createdAt)
      .setZone(zone)
      .toFormat(dateFormat);

    if (!salesTrendByPeriod[periodKey]) {
      salesTrendByPeriod[periodKey] = {
        id: periodKey, // ใช้เป็น key ของกราฟ / React key
        label: periodKey, // แกน X (เช่น "2026-11-17")
        total: 0, // แกน Y (ยอดขายรวม)
      };
    }

    salesTrendByPeriod[periodKey].total += Number(order.totalAmount ?? 0);
  });

  const salesTrend = Object.values(salesTrendByPeriod);

  // Sale Trend By Category
  const salesByCategoryMap = {};

  orderItemsInRange.forEach((item) => {
    const category = item.product?.categories;
    const categoryId = category?.id || "uncategorized";
    const categoryLabel = category?.name || "Uncategorized";
    const itemRevenue = Number(item.price ?? 0) * Number(item.quantity ?? 0);

    if (!salesByCategoryMap[categoryId]) {
      salesByCategoryMap[categoryId] = {
        id: categoryId,
        label: categoryLabel,
        total: 0,
      };
    }

    salesByCategoryMap[categoryId].total += itemRevenue;
  });
  // แปลงเป็น Array แล้วเรียงจากยอดขายมากสุด -> น้อยสุด
  const salesByCategory = Object.values(salesByCategoryMap).sort(
    (a, b) => b.total - a.total,
  );

  const topProductsMap = {};

  orderItemsInRange.forEach((item) => {
    const product = item.product;
    if (!product) return;
    const qty = Number(item.quantity ?? 0);
    const itemRevenue = Number(item.price ?? 0) * qty;
    if (!topProductsMap[product.id]) {
      topProductsMap[product.id] = {
        id: product.id,
        name: product.name,
        image: product.images?.[0] || null,
        unitsSold: 0,
        revenue: 0,
      };
    }
    topProductsMap[product.id].unitsSold += qty;
    topProductsMap[product.id].revenue += itemRevenue;
  });

  const topProducts = Object.values(topProductsMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return {
    kpis: {
      revenue,
      ordersCount,
      newCustomers: newCustomerCount,
      aov,
    },
    salesTrend,
    salesByCategory,
    recentOrders,
    topProducts,
  };
};
