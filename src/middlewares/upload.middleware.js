import multer from "multer";
import path from "path";
import fs from "fs";

// สร้างโฟลเดอร์ uploads อัตโนมัติถ้ายังไม่มี
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// กำหนด Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    // ป้องกันชื่อไฟล์ซ้ำด้วย timestamp + random string
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// กรองประเภทไฟล์ (รับเฉพาะรูปภาพ)
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only JPEG, PNG, WEBP, and GIF are allowed.",
      ),
      false,
    );
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // จำกัดขนาด 5MB
});
