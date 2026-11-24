import crypto from "crypto";
import prisma from "../config/prisma.js";

export const getShippingRatesService = async ({ activeOnly = false } = {}) => {
  return prisma.shippingRate.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: [{ sortOrder: "asc" }, { price: "asc" }],
  });
};

export const createShippingRateService = async (payload) => {
  const {
    name,
    price = 0,
    freeMinSpend,
    minDays = 1,
    maxDays = 3,
    isActive = true,
    sortOrder = 0,
  } = payload;

  if (!name?.trim()) throw new Error("Shipping name is required");

  return prisma.shippingRate.create({
    data: {
      id: `ship-${crypto.randomUUID().slice(0, 8)}`,
      name: name.trim(),
      price: Number(price),
      freeMinSpend:
        freeMinSpend !== undefined &&
        freeMinSpend !== null &&
        freeMinSpend !== ""
          ? Number(freeMinSpend)
          : null,
      minDays: Number(minDays),
      maxDays: Number(maxDays),
      isActive: Boolean(isActive),
      sortOrder: Number(sortOrder),
    },
  });
};

export const updateShippingRateService = async (id, payload) => {
  const existing = await prisma.shippingRate.findUnique({ where: { id } });

  if (!existing) throw new Error("Shipping rate not found");

  return prisma.shippingRate.update({
    where: { id },
    data: {
      name: payload.name !== undefined ? payload.name.trim() : undefined,
      price: payload.price !== undefined ? Number(payload.price) : undefined,
      freeMinSpend:
        payload.freeMinSpend !== undefined
          ? payload.freeMinSpend === null || payload.freeMinSpend === ""
            ? null
            : Number(payload.freeMinSpend)
          : undefined,
      minDays:
        payload.minDays !== undefined ? Number(payload.minDays) : undefined,
      maxDays:
        payload.maxDays !== undefined ? Number(payload.maxDays) : undefined,
      isActive:
        payload.isActive !== undefined ? Boolean(payload.isActive) : undefined,
      sortOrder:
        payload.sortOrder !== undefined ? Number(payload.sortOrder) : undefined,
    },
  });
};
