import prisma from "../src/config/prisma.js";
import bcrypt from "bcryptjs";

const COUNT = 10000;
const BATCH_SIZE = 2000;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function insertInBatches(model, data) {
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const chunk = data.slice(i, i + BATCH_SIZE);
    await model.createMany({ data: chunk, skipDuplicates: true });
  }
}

async function main() {
  const batchId = Date.now();
  const now = new Date();
  const passwordHash = await bcrypt.hash("Password123!", 4);

  // 1. Seed 10,000 Users
  const usersData = [];
  for (let i = 0; i < COUNT; i++) {
    const createdAt = new Date(now);
    createdAt.setDate(now.getDate() - randomInt(0, 365));
    usersData.push({
      id: `usr10k-${batchId}-${i}`,
      email: `user10k_${batchId}_${i}@example.com`,
      password: passwordHash,
      role: i % 50 === 0 ? "staff" : "customer",
      firstName: `User${i}`,
      lastName: `Test${i % 100}`,
      phone: `08${String(10000000 + (i % 89999999))}`,
      createdAt,
    });
  }
  await insertInBatches(prisma.user, usersData);
  console.log(`Seeded ${COUNT} users.`);

  // 2. Seed 10,000 Categories
  const catStatuses = ["active", "active", "active", "draft", "archived"];
  const categoriesData = [];
  for (let i = 0; i < COUNT; i++) {
    categoriesData.push({
      id: `cat10k-${batchId}-${i}`,
      name: `Category ${batchId}-${i}`,
      slug: `category-${batchId}-${i}`,
      status: catStatuses[i % catStatuses.length],
    });
  }
  await insertInBatches(prisma.category, categoriesData);
  console.log(`Seeded ${COUNT} categories.`);

  // 3. Seed 10,000 Products
  const prodStatuses = ["published", "published", "published", "draft", "archived"];
  const productsData = [];
  for (let i = 0; i < COUNT; i++) {
    const sellPrice = randomInt(190, 9900);
    productsData.push({
      id: `prod10k-${batchId}-${i}`,
      name: `Product ${batchId}-${i}`,
      slug: `product-${batchId}-${i}`,
      description: `Sample bulk product #${i}`,
      originalPrice: sellPrice + randomInt(50, 500),
      sellPrice,
      stock: randomInt(0, 200),
      images: [],
      status: prodStatuses[i % prodStatuses.length],
      categoryId: categoriesData[i].id,
    });
  }
  await insertInBatches(prisma.product, productsData);
  console.log(`Seeded ${COUNT} products.`);

  // 4. Seed 10,000 Orders + 10,000 OrderItems
  const orderStatuses = ["delivered", "paid", "shipped", "pending", "delivered"];
  const ordersData = [];
  const orderItemsData = [];

  for (let i = 0; i < COUNT; i++) {
    const createdAt = new Date(now);
    if (i < 1000) {
      createdAt.setHours(randomInt(0, 23), randomInt(0, 59), randomInt(0, 59), 0);
    } else if (i < 3500) {
      createdAt.setDate(now.getDate() - randomInt(1, 6));
      createdAt.setHours(randomInt(0, 23), randomInt(0, 59), 0, 0);
    } else if (i < 7500) {
      createdAt.setMonth(now.getMonth() - randomInt(1, 11));
      createdAt.setDate(randomInt(1, 28));
      createdAt.setHours(randomInt(0, 23), randomInt(0, 59), 0, 0);
    } else {
      createdAt.setFullYear(now.getFullYear() - randomInt(1, 3));
      createdAt.setMonth(randomInt(0, 11));
      createdAt.setDate(randomInt(1, 28));
      createdAt.setHours(randomInt(0, 23), randomInt(0, 59), 0, 0);
    }

    const prod = productsData[i];
    const qty = randomInt(1, 4);
    const totalAmount = prod.sellPrice * qty;
    const orderId = `ord10k-${batchId}-${i}`;

    ordersData.push({
      id: orderId,
      userId: usersData[i].id,
      totalAmount,
      status: i % 25 === 0 ? "cancelled" : orderStatuses[i % orderStatuses.length],
      paymentMethod: "cod",
      shippingAddress: "123 Bangkok, Thailand",
      shippingPhone: "0812345678",
      createdAt,
    });

    orderItemsData.push({
      id: `item10k-${batchId}-${i}`,
      orderId,
      productId: prod.id,
      price: prod.sellPrice,
      quantity: qty,
      createdAt,
    });
  }

  await insertInBatches(prisma.order, ordersData);
  await insertInBatches(prisma.orderItem, orderItemsData);
  console.log(`Seeded ${COUNT} orders and ${COUNT} order items.`);
}

main()
  .catch((err) => {
    console.error("Bulk seed error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

