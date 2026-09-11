const jwt = require("jsonwebtoken");
const { jwtSecret } = require("..");

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Token tidak ditemukan" });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "Token tidak valid" });
  }
}

function authorizeAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Token tidak ditemukan" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Akses admin dibutuhkan" });
  }

  next();
}

module.exports = { authenticate, authorizeAdmin };
