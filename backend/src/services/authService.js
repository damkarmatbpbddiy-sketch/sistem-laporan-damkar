const bcrypt = require("bcrypt");
const { query } = require("../config/db");
const { signToken, createRefreshToken, verifyToken } = require("../utils/jwt");

async function registerUser({ name, email, password, role = "user" }) {
  if (!name || !email || !password) {
    throw { status: 400, message: "Semua field harus diisi" };
  }

  if (typeof password !== "string" || password.length < 6) {
    throw { status: 400, message: "Password minimal 6 karakter" };
  }

  const existing = await query("SELECT id FROM users WHERE email = ?", [email]);
  if (existing.rows.length) {
    throw { status: 409, message: "Email sudah terdaftar" };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const normalizedRole = role === "admin" ? "admin" : "user";
  const insertResult = await query(
    "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
    [name, email, passwordHash, normalizedRole]
  );

  const createdUser = await query(
    "SELECT id, name, email, created_at FROM users WHERE id = ?",
    [insertResult.insertId]
  );

  return createdUser.rows[0];
}

async function authenticateUser({ email, identifier, password, role = "user" }) {
  const loginIdentifier = (email || identifier || "").toString().trim();
  if (!loginIdentifier || !password) {
    throw { status: 400, message: "Email atau username dan password harus diisi" };
  }

  const result = await query(
    "SELECT id, name, email, password_hash, role FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(name) = LOWER(?)",
    [loginIdentifier, loginIdentifier]
  );
  if (!result.rows.length) {
    throw { status: 401, message: "Email atau password salah" };
  }

  const user = result.rows[0];
  if (role === "admin" && user.role !== "admin") {
    throw { status: 403, message: "Akses admin dibutuhkan" };
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    throw { status: 401, message: "Email atau password salah" };
  }

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  const refreshToken = createRefreshToken(user);
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    token,
    refreshToken,
  };
}

async function changePasswordUser(userId, { currentPassword, newPassword }) {
  if (!currentPassword || !newPassword) {
    throw { status: 400, message: "Password lama dan baru harus diisi" };
  }

  if (typeof newPassword !== "string" || newPassword.length < 6) {
    throw { status: 400, message: "Password baru minimal 6 karakter" };
  }

  const result = await query("SELECT password_hash FROM users WHERE id = ?", [userId]);
  if (!result.rows.length) {
    throw { status: 404, message: "Pengguna tidak ditemukan" };
  }

  const user = result.rows[0];
  const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
  if (!validPassword) {
    throw { status: 401, message: "Password saat ini salah" };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await query("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, userId]);

  return { message: "Password berhasil diperbarui" };
}

async function refreshAccessToken({ refreshToken }) {
  if (!refreshToken) {
    throw { status: 400, message: "Refresh token harus ada" };
  }

  try {
    const payload = verifyToken(refreshToken);
    const userResult = await query("SELECT id, name, email, role FROM users WHERE id = ?", [payload.id]);
    if (!userResult.rows.length) {
      throw { status: 401, message: "Refresh token tidak valid" };
    }

    const token = signToken({ id: payload.id, email: payload.email, role: payload.role });
    return { token };
  } catch (error) {
    throw { status: 401, message: "Refresh token tidak valid" };
  }
}

module.exports = {
  registerUser,
  authenticateUser,
  changePasswordUser,
  refreshAccessToken,
};
