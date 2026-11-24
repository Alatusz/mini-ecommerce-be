import prisma from "../src/config/prisma.js";

const ORDER_STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"];
const PAYMENT_STATUSES = ["pending", "completed", "failed", "refund"];
const PAYMENT_METHODS = ["cod", "credit_card", "promptpay"];

async function main() {
  const users = await prisma.user.findMany({ take: 20, select: { id: true } });
  const products = await prisma.product.findMany({
    take: 20,
    select: { id: true, sellPrice: true },
  });

  if (users.length === 0) {
    console.error("No users found.");
    process.exit(1);
  }

  const batchId = Date.now();
  const now = new Date();
  const ordersData = [];
  const itemsData = [];

  for (let i = 0; i < 1000; i++) {
    const createdAt = new Date(now);
    createdAt.setDate(now.getDate() - (i % 30));

    const prod = products[i % products.length];
    const unitPrice = prod?.sellPrice ? Number(prod.sellPrice) : 1000;
    const qty = (i % 3) + 1;
    const orderId = `ordv-${batchId}-${i}`;

    ordersData.push({
      id: orderId,
      userId: users[i % users.length].id,
      totalAmount: unitPrice * qty,
      status: ORDER_STATUSES[i % ORDER_STATUSES.length],
      paymentStatus: PAYMENT_STATUSES[i % PAYMENT_STATUSES.length],
      paymentMethod: PAYMENT_METHODS[i % PAYMENT_METHODS.length],
      shippingAddress: "123 Bangkok, Thailand",
      shippingPhone: "0812345678",
      createdAt,
    });

    if (prod) {
      itemsData.push({
        id: `itemv-${batchId}-${i}`,
        orderId,
        productId: prod.id,
        price: unitPrice,
        quantity: qty,
        createdAt,
      });
    }
  }

  await prisma.order.createMany({ data: ordersData });
  if (itemsData.length > 0) {
    await prisma.orderItem.createMany({ data: itemsData });
  }

  console.log("Seeded 1000 orders covering all OrderStatus, PaymentStatus, and PaymentMethod values.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
