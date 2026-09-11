const express = require("express");
const multer = require("multer");
const path = require("path");
const { createReport, getReports, editReport, removeReport } = require("../controllers/reportController");
const { authenticate } = require("../middlewares/authMiddleware");
const { validateReport } = require("../validators/reportValidator");

const router = express.Router();

const upload = multer({
  dest: path.resolve(process.cwd(), "uploads"),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Format file tidak didukung"));
    }
    cb(null, true);
  },
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ success: false, message: "Ukuran file terlalu besar, maksimal 5MB" });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err && err.message === "Format file tidak didukung") {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
});

router.get("/", authenticate, getReports);
router.post("/", authenticate, upload.single("image"), validateReport, createReport);
router.put("/:id", authenticate, validateReport, editReport);
router.delete("/:id", authenticate, removeReport);

module.exports = router;
