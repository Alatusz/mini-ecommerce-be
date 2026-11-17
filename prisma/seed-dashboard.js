import prisma from "../src/config/prisma.js";
import crypto from "crypto";

async function main() {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!user) {
    console.error("No user found in database. Please create a user first.");
    process.exit(1);
  }

  const product = await prisma.product.findFirst();

  const daysAgoList = [13, 12, 10, 9, 8, 7, 5, 4, 3, 2, 1, 0];
  const statuses = [
    "delivered",
    "paid",
    "shipped",
    "delivered",
    "paid",
    "pending",
    "delivered",
    "paid",
    "shipped",
    "delivered",
    "paid",
    "cancelled",
  ];

  const amounts = [1250, 3400, 890, 5200, 2100, 1500, 4800, 2950, 6100, 1800, 3750, 990];

  for (let i = 0; i < daysAgoList.length; i++) {
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgoList[i]);
    createdAt.setHours(10 + (i % 8), 15, 0, 0);

    const orderId = `SEED-${Date.now()}-${i}-${crypto.randomBytes(2).toString("hex")}`;

    await prisma.order.create({
      data: {
        id: orderId,
        userId: user.id,
        totalAmount: amounts[i],
        status: statuses[i],
        paymentMethod: "cod",
        shippingAddress: "123 Bangkok, Thailand",
        shippingPhone: "0812345678",
        createdAt,
        ...(product
          ? {
              items: {
                create: {
                  id: `ITEM-${Date.now()}-${i}-${crypto.randomBytes(2).toString("hex")}`,
                  productId: product.id,
                  price: amounts[i],
                  quantity: 1,
                  createdAt,
                },
              },
            }
          : {}),
      },
    });
  }

  console.log(`Seeded ${daysAgoList.length} orders across the last 14 days.`);
}

main()
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
