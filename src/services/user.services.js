import prisma from "../config/prisma.js";
import bcrypt from "bcryptjs";

export const getProfileService = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      bio: true,
      addresses: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

export const updateProfileService = async (
  userId,
  { firstName, lastName, phone, bio },
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const updateData = await prisma.user.update({
    where: { id: userId },
    data: {
      firstName: firstName?.trim(),
      lastName: lastName?.trim(),
      phone: phone?.trim(),
      bio: bio?.trim(),
    },
    select: {
      id: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      phone: true,
      bio: true,
    },
  });

  return updateData;
};

export const changePasswordService = async (
  userId,
  { currentPassword, newPassword },
) => {
  if (!currentPassword || !newPassword) {
    throw new Error("Current password and new password are required");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found")
  }

  const isPasswordMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isPasswordMatch) {
    throw new Error("Invalid current password");
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  return { message: "Password updated successfully" };
};

const USER_SELECT = {
  id: true,
  email: true,
  role: true,
  firstName: true,
  lastName: true,
  phone: true,
  bio: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: { orders: true },
  },
};

export const getAllUsersService = async ({
  page = 1,
  limit = 10,
  search = "",
  searchBy = "",
  role = "",
} = {}) => {
  const skip = (page - 1) * limit;
  const where = {};

  if (role) {
    const roles = role
      .split(",")
      .map((r) => r.trim().toLowerCase())
      .filter((r) => ["admin", "staff", "customer"].includes(r));
    if (roles.length > 0) {
      where.role = { in: roles };
    }
  }

  if (search && search.trim()) {
    const q = search.trim();
    const targets = searchBy
      ? searchBy
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter((s) => s === "name" || s === "email")
      : [];

    if (targets.length === 1 && targets[0] === "email") {
      where.email = { contains: q, mode: "insensitive" };
    } else if (targets.length === 1 && targets[0] === "name") {
      where.OR = [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
      ];
    } else {
      where.OR = [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: USER_SELECT,
    }),
    prisma.user.count({ where }),
  ]);

  const data = users.map((u) => ({
    ...u,
    ordersCount: u._count?.orders ?? 0,
  }));

  return { data, total, page, limit };
};

export const getUserByIdService = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: USER_SELECT,
  });

  if (!user) {
    throw new Error("User not found");
  }

  return {
    ...user,
    ordersCount: user._count?.orders ?? 0,
  };
};

export const createUserService = async ({
  email,
  password,
  role = "customer",
  firstName,
  lastName,
  phone,
  bio,
}) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("Email already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  return prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role,
      firstName: firstName || null,
      lastName: lastName || null,
      phone: phone || null,
      bio: bio || null,
    },
    select: USER_SELECT,
  });
};

export const updateUserService = async (
  id,
  { email, password, role, firstName, lastName, phone, bio }
) => {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("User not found");
  }

  const updateData = {
    ...(email !== undefined && { email }),
    ...(role !== undefined && { role }),
    ...(firstName !== undefined && { firstName }),
    ...(lastName !== undefined && { lastName }),
    ...(phone !== undefined && { phone }),
    ...(bio !== undefined && { bio }),
  };

  if (password && password.trim()) {
    updateData.password = await bcrypt.hash(password, 10);
  }

  return prisma.user.update({
    where: { id },
    data: updateData,
    select: USER_SELECT,
  });
};

export const deleteUserService = async (id) => {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("User not found");
  }

  await prisma.user.delete({ where: { id } });
  return { id };
};
