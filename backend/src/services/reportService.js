const fs = require("fs");
const path = require("path");
const { query } = require("../config/db");
const { uploadDir } = require("..");

async function saveReport({ userId, title, location, description, file }) {
  if (!title || !location || !description) {
    throw { status: 400, message: "Title, lokasi, dan description harus diisi" };
  }

  let imageUrl = null;
  if (file) {
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
      const extension = path.extname(file.originalname);
      const targetFilename = `${file.filename}${extension}`;
      const targetPath = path.join(uploadDir, targetFilename);
      fs.renameSync(file.path, targetPath);
      imageUrl = `/uploads/${targetFilename}`;
    } catch (err) {
      if (file.path && fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
        } catch (cleanupErr) {
          console.warn("Cleanup failed after upload error:", cleanupErr.message);
        }
      }
      throw { status: 500, message: "Gagal menyimpan file gambar" };
    }
  }

  const insertResult = await query(
    `INSERT INTO reports (user_id, title, location, description, image_url)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, title, location, description, imageUrl]
  );

  const createdReport = await query(
    `SELECT id, title, location, description, image_url, status, created_at
     FROM reports WHERE id = ?`,
    [insertResult.insertId]
  );

  return createdReport.rows[0];
}

async function getAllReports() {
  const result = await query(
    `SELECT r.id,
            r.title,
            r.location,
            r.description,
            r.image_url,
            r.status,
            r.created_at,
            u.id AS user_id,
            u.name AS user_name
      FROM reports r
      JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC`
  );

  return result.rows;
}

async function updateReport({ reportId, userId, role, title, location, description, status }) {
  const existing = await query("SELECT user_id, status FROM reports WHERE id = ?", [reportId]);
  if (!existing.rows.length) {
    throw { status: 404, message: "Laporan tidak ditemukan" };
  }

  const isOwner = existing.rows[0].user_id === userId;
  const isAdmin = role === "admin";
  if (!isOwner && !isAdmin) {
    throw { status: 403, message: "Anda tidak memiliki akses untuk mengubah laporan ini" };
  }

  const nextStatus = status || existing.rows[0].status;
  await query(
    `UPDATE reports SET title = ?, location = ?, description = ?, status = ? WHERE id = ?`,
    [title, location, description, nextStatus, reportId]
  );

  const updated = await query(
    `SELECT id, title, location, description, image_url, status, created_at FROM reports WHERE id = ?`,
    [reportId]
  );

  return updated.rows[0];
}

async function deleteReport({ reportId, userId, role }) {
  const existing = await query("SELECT user_id FROM reports WHERE id = ?", [reportId]);
  if (!existing.rows.length) {
    throw { status: 404, message: "Laporan tidak ditemukan" };
  }

  const isOwner = existing.rows[0].user_id === userId;
  const isAdmin = role === "admin";
  if (!isOwner && !isAdmin) {
    throw { status: 403, message: "Anda tidak memiliki akses untuk menghapus laporan ini" };
  }

  await query("DELETE FROM reports WHERE id = ?", [reportId]);
  return { deleted: true, id: reportId };
}

module.exports = {
  saveReport,
  getAllReports,
  updateReport,
  deleteReport,
};
