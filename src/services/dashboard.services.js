import prisma from "../config/prisma.js";
import { buildDashboardRange } from "../utils/dateRange.js";

export const getDashboardOverviewService = async ({
  startDate,
  endDate,
  tz,
}) => {
  const { start, end, startDt, endDt, zone } = buildDashboardRange({
    startDate,
    endDate,
    tz,
  });

  const dateFormat = "yyyy-MM-dd";

  const createdAtRange = {
    gte: start,
    lte: end,
  };

  const [
    orderSummaryAgg,
    newCustomerCount,
    recentOrders,
    trendRows,
    trendCategory,
    topProducts,
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
      take: 5,
      where: { createdAt: createdAtRange },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        totalAmount: true,
        status: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    }),
    prisma.$queryRaw`
      SELECT
        TO_CHAR("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${zone}, 'YYYY-MM-DD') AS "label",
        COALESCE(SUM("totalAmount"), 0)::float AS "total"
      FROM "orders"
      WHERE "createdAt" >= ${start}
        AND "createdAt" <= ${end}
        AND "status" != 'cancelled'
      GROUP BY 1
      ORDER BY 1 ASC
    `,
    prisma.$queryRaw`
      SELECT
        COALESCE(c."id", 'uncategorized') AS "id",
        COALESCE(c."name", 'Uncategorized') AS "label",
        COALESCE(SUM(oi."price" * oi."quantity"), 0)::float AS "total"
      FROM "order_items" oi
      INNER JOIN "orders" o ON o."id" = oi."orderId"
      INNER JOIN "products" p ON p."id" = oi."productId"
      LEFT JOIN "categories" c ON c."id" = p."categoryId"
      WHERE o."createdAt" >= ${start}
        AND o."createdAt" <= ${end}
        AND o."status" != 'cancelled'
      GROUP BY c."id", c."name"
      ORDER BY "total" DESC
      LIMIT 5
    `,
    prisma.$queryRaw`
      SELECT
        p."id",
        p."name",
        p."images"[1] AS "image",
        SUM(oi."quantity")::int AS "unitsSold",
        SUM(oi."price" * oi."quantity")::float AS "revenue"
      FROM "order_items" oi
      INNER JOIN "orders" o ON o."id" = oi."orderId"
      INNER JOIN "products" p ON p."id" = oi."productId"
      WHERE o."createdAt" >= ${start}
        AND o."createdAt" <= ${end}
        AND o."status" != 'cancelled'
      GROUP BY p."id", p."name", p."images"
      ORDER BY "revenue" DESC
      LIMIT 5
    `,
  ]);

  const revenue = Number(orderSummaryAgg._sum.totalAmount ?? 0);
  const ordersCount = orderSummaryAgg._count.id ?? 0;
  const aov = ordersCount > 0 ? Math.round(revenue / ordersCount) : 0;

  // Sale Trend Graph
  const salesTrendByPeriod = {};

  let cursor = startDt;
  while (cursor <= endDt) {
    const periodKey = cursor.toFormat(dateFormat);
    salesTrendByPeriod[periodKey] = {
      label: periodKey,
      total: 0,
    };
    cursor = cursor.plus({ days: 1 });
  }

  trendRows.forEach((row) => {
    if (salesTrendByPeriod[row.label]) {
      salesTrendByPeriod[row.label].total = row.total;
    }
  });

  const salesTrend = Object.values(salesTrendByPeriod);

  return {
    kpis: {
      revenue,
      ordersCount,
      newCustomers: newCustomerCount,
      aov,
    },
    salesTrend,
    salesByCategory: trendCategory,
    recentOrders,
    topProducts,
  };
};
