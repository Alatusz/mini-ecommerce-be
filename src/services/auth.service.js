import bcrypt from "bcryptjs";
import prisma from "../config/prisma.js";
import jwt from "jsonwebtoken";

export const registerUser = async ({ email, password }) => {
  // Email Check
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error("Email already exists");
  }

  //Hash Password
  const salt = await bcrypt.genSalt(10);

  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role: "customer",
    },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
  return newUser;
};

export const loginUser = async ({ email, password }) => {
  // Email Check
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Password Check
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new Error("Invalid email or password");
  }

  // JWT Token
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    },
  );

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    token,
  };
};

export const authenticate = (req, res, next) => {
  try {
    // ดึง token จาก Header "Authorization: Bearer <token>" หรือจาก Cookie
    const authHeader = req.headers.authorization || req.cookies.token;

    if (!authHeader) {
      throw new Error("Unauthorized");
    }

    const token = authHeader.startsWith("Bearer")
      ? authHeader.split(" ")[1]
      : authHeader;

    // Decoded Token
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user data to the request
    req.user = decodedToken;

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Session หมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่",
    });
  }
};

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const userRole = user.role;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    next();
  };
};
