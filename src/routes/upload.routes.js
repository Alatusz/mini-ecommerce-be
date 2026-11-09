import { Router } from "express";
import multer from "multer";
import { upload } from "../middlewares/upload.middleware.js";

const router = Router();

router.post("/single", (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "File size exceeds 5MB limit" });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    // สร้าง Full URL เพื่อส่งกลับไปให้ FE นำไปบันทึก
    const protocol = req.protocol;
    const host = req.get("host");
    const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

    return res.status(200).json({
      message: "Image uploaded successfully",
      url: fileUrl,
      filename: req.file.filename,
    });
  });
});

export default router;
