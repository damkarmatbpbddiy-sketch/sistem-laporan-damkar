const { registerUser, authenticateUser, refreshAccessToken, changePasswordUser } = require("../services/authService");
const { success, errorResponse } = require("../utils/response");

async function registerAdmin(req, res, next) {
  try {
    const user = await registerUser({ ...req.body, role: "admin" });
    return success(res, { user }, "Admin berhasil dibuat", 201);
  } catch (error) {
    if (error.status) {
      return errorResponse(res, error.message, error.status);
    }
    next(error);
  }
}

async function register(req, res, next) {
  try {
    const user = await registerUser(req.body);
    return success(res, { user }, "Registrasi berhasil", 201);
  } catch (error) {
    if (error.status) {
      return errorResponse(res, error.message, error.status);
    }
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const authResult = await authenticateUser({ ...req.body, role: "user" });
    return success(res, authResult, "Login berhasil");
  } catch (error) {
    if (error.status) {
      return errorResponse(res, error.message, error.status);
    }
    next(error);
  }
}

async function adminLogin(req, res, next) {
  try {
    const authResult = await authenticateUser({ ...req.body, role: "admin" });
    return success(res, authResult, "Login admin berhasil");
  } catch (error) {
    if (error.status) {
      return errorResponse(res, error.message, error.status);
    }
    next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    const result = await changePasswordUser(req.user.id, req.body);
    return success(res, result, "Password berhasil diperbarui");
  } catch (error) {
    if (error.status) {
      return errorResponse(res, error.message, error.status);
    }
    next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const result = await refreshAccessToken(req.body);
    return success(res, result, "Token berhasil diperbarui");
  } catch (error) {
    if (error.status) {
      return errorResponse(res, error.message, error.status);
    }
    next(error);
  }
}

module.exports = {
  register,
  login,
  adminLogin,
  registerAdmin,
  changePassword,
  refresh,
};
