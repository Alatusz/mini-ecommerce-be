import crypto from "crypto";
import prisma from "../config/prisma.js";

const VALID_TAGS = ["home", "office", "condo"];

/**
 * 1. ดึงรายการที่อยู่ทั้งหมดของผู้ใช้
 */
export const getAddressesService = async (userId) => {
  const addresses = await prisma.address.findMany({
    where: { userId },
    orderBy: [
      { isDefault: "desc" },
      { createdAt: "desc" },
    ],
  });

  return addresses;
};

/**
 * 2. เพิ่มที่อยู่ใหม่
 */
export const addAddressService = async (
  userId,
  { title, tag = "home", address, phone, isDefault = false }
) => {
  if (!title || !title.trim()) {
    throw new Error("Title is required");
  }
  if (!address || !address.trim()) {
    throw new Error("Address is required");
  }
  if (!phone || !phone.trim()) {
    throw new Error("Phone is required");
  }

  const cleanTag = tag?.toLowerCase();
  if (!VALID_TAGS.includes(cleanTag)) {
    throw new Error(`Invalid tag. Must be one of: ${VALID_TAGS.join(", ")}`);
  }

  // เช็คว่ามีที่อยู่เดิมอยู่แล้วหรือไม่ ถ้ายังไม่มี ให้ที่อยู่นี้เป็น default อัตโนมัติ
  const addressCount = await prisma.address.count({
    where: { userId },
  });

  const shouldBeDefault = addressCount === 0 ? true : Boolean(isDefault);

  // ถ้าที่อยู่นี้เป็น default ให้ปลด default ของที่อยู่อื่นออกก่อน
  if (shouldBeDefault && addressCount > 0) {
    await prisma.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  const uniqueId = crypto.randomUUID().slice(0, 8);
  const customId = `addr-${uniqueId}`;

  const newAddress = await prisma.address.create({
    data: {
      id: customId,
      title: title.trim(),
      tag: cleanTag,
      address: address.trim(),
      phone: phone.trim(),
      isDefault: shouldBeDefault,
      userId,
    },
  });

  return newAddress;
};

/**
 * 3. แก้ไขข้อมูลที่อยู่
 */
export const updateAddressService = async (
  userId,
  addressId,
  { title, tag, address, phone, isDefault }
) => {
  const existingAddress = await prisma.address.findFirst({
    where: {
      id: addressId,
      userId,
    },
  });

  if (!existingAddress) {
    throw new Error("Address not found");
  }

  const cleanTag = tag !== undefined ? tag.toLowerCase() : undefined;
  if (cleanTag && !VALID_TAGS.includes(cleanTag)) {
    throw new Error(`Invalid tag. Must be one of: ${VALID_TAGS.join(", ")}`);
  }

  // ถ้าจะตั้งเป็น default ให้ปลดอันอื่นออก
  if (isDefault === true) {
    await prisma.address.updateMany({
      where: {
        userId,
        id: { not: addressId },
        isDefault: true,
      },
      data: { isDefault: false },
    });
  }

  const updatedAddress = await prisma.address.update({
    where: { id: addressId },
    data: {
      title: title !== undefined ? title.trim() : undefined,
      tag: cleanTag,
      address: address !== undefined ? address.trim() : undefined,
      phone: phone !== undefined ? phone.trim() : undefined,
      isDefault: isDefault !== undefined ? Boolean(isDefault) : undefined,
    },
  });

  return updatedAddress;
};

/**
 * 4. ลบที่อยู่
 */
export const deleteAddressService = async (userId, addressId) => {
  const existingAddress = await prisma.address.findFirst({
    where: {
      id: addressId,
      userId,
    },
  });

  if (!existingAddress) {
    throw new Error("Address not found");
  }

  await prisma.address.delete({
    where: { id: addressId },
  });

  // ถ้าอันที่ลบไปเป็น default ให้ตั้งอันที่เหลือล่าสุดเป็น default แทน
  if (existingAddress.isDefault) {
    const nextAddress = await prisma.address.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (nextAddress) {
      await prisma.address.update({
        where: { id: nextAddress.id },
        data: { isDefault: true },
      });
    }
  }

  return { message: "Address deleted successfully" };
};

/**
 * 5. ตั้งที่อยู่เป็น Default
 */
export const setDefaultAddressService = async (userId, addressId) => {
  const existingAddress = await prisma.address.findFirst({
    where: {
      id: addressId,
      userId,
    },
  });

  if (!existingAddress) {
    throw new Error("Address not found");
  }

  await prisma.$transaction([
    prisma.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    }),
    prisma.address.update({
      where: { id: addressId },
      data: { isDefault: true },
    }),
  ]);

  return { message: "Default address updated successfully" };
};

