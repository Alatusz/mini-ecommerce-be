import prisma from "../config/prisma.js";
import { buildUtcDateRange } from "../utils/dateRange.js";
import { DateTime } from "luxon";

export const getDashboardOverviewService = async ({
  startDate,
  endDate,
  tz,
}) => {
  const { start, end, zone } = buildUtcDateRange(startDate, endDate, tz);

  const dateFilter = {
    gte: start,
    lte: end,
  };

  const [ordersAgg, newCustomers, trendOrders] = await Promise.all([
    prisma.order.aggregate({
      where: { createdAt: dateFilter, status: { not: "cancelled" } },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
    prisma.user.count({
      where: { role: "customer", createdAt: dateFilter },
    }),
    prisma.order.findMany({
      where: { createdAt: dateFilter, status: { not: "cancelled" } },
      select: { createdAt: true, totalAmount: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const revenue = Number(ordersAgg._sum.totalAmount ?? 0);
  
  const ordersCount = ordersAgg._count.id ?? 0;
  const aov = ordersCount > 0 ? Math.round(revenue / ordersCount) : 0;

  const grouped = {};
  trendOrders.forEach((order) => {
    // แปลงเวลาเป็นวันที่ตาม TimeZone ของ User เช่น "2026-11-16"
    const date = DateTime.fromJSDate(order.createdAt).setZone(zone).toISODate();
    // ถ้ายังไม่มีวันนี้ใน grouped ให้สร้างค่าเริ่มต้นก่อน
    if (!grouped[date]) {
      grouped[date] = { date, revenue: 0, orders: 0 };
    }
    // บวกยอดเงินและจำนวนออเดอร์เข้าไป
    grouped[date].revenue += Number(order.totalAmount ?? 0);
    grouped[date].orders += 1;
  });
  // 3. แปลง Object เป็น Array ส่งให้กราฟ
  const salesTrend = Object.values(grouped);

  return {
    kpis: {
      revenue,
      ordersCount,
      newCustomers,
      aov,
    },
    salesTrend,
    // salesByCategory,
    // recentOrders,
    // topProducts,
  };
};
