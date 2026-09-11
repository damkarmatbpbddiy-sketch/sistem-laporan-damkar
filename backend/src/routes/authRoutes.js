const express = require("express");
const { register, login, adminLogin, registerAdmin, changePassword, refresh } = require("../controllers/authController");
const { validateRegister, validateLogin } = require("../validators/authValidator");
const { authenticate } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/register", validateRegister, register);
router.post("/register-admin", validateRegister, registerAdmin);
router.post("/login", validateLogin, login);
router.post("/admin/login", validateLogin, adminLogin);
router.post("/change-password", authenticate, changePassword);
router.post("/refresh", refresh);

module.exports = router;
