const db = require('../config/db');
const { validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');

function parseDbError(error) {
  if (error.code === '28P01') {
    return 'Koneksi Database Gagal: Password PostgreSQL salah. Harap sesuaikan DB_PASSWORD di backend/.env';
  } else if (error.code === '3D000') {
    return 'Koneksi Database Gagal: Database "damkar_db" tidak ditemukan. Harap jalankan "npm run seed".';
  } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
    return 'Koneksi Database Gagal: Username/Password MySQL salah. Periksa DB_USER dan DB_PASSWORD di backend/.env.';
  } else if (error.code === 'ER_BAD_DB_ERROR') {
    return 'Koneksi Database Gagal: Database "damkar_db" belum ada di MySQL/phpMyAdmin. Impor file backend/sql/database_phpmyadmin.sql.';
  } else if (error.code === 'ECONNREFUSED') {
    return 'Koneksi Database Gagal: MySQL/XAMPP belum aktif atau port 3306 tidak bisa dijangkau. Start MySQL di XAMPP Control Panel.';
  }
  return null;
}

// 1. Create Laporan Baru (Masyarakat)
const createLaporan = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Validasi gagal. Harap lengkapi semua field yang wajib diisi.',
        errors: errors.array()
      });
    }

    const { judul_kejadian, nama_pelapor, nomor_hp, alamat, latitude, longitude, kabupaten, kecamatan, kalurahan, jenis_kejadian, deskripsi } = req.body;
    const foto = req.file ? req.file.filename : null;

    const query = `
      INSERT INTO laporan (judul_kejadian, nama_pelapor, nomor_hp, alamat, latitude, longitude, kabupaten, kecamatan, kalurahan, jenis_kejadian, deskripsi, foto, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Menunggu')
      RETURNING *
    `;

    const values = [
      judul_kejadian,
      nama_pelapor,
      nomor_hp,
      alamat,
      latitude || '',
      longitude || '',
      kabupaten || '',
      kecamatan || '',
      kalurahan || '',
      jenis_kejadian || '',
      deskripsi,
      foto
    ];

    const result = await db.query(query, values);
    const newLaporan = result.rows[0];

    const autoResponseMsg = `Terima kasih Sdr/i ${nama_pelapor || 'Pelapor'}. Laporan kejadian "${judul_kejadian}" telah berhasil diterima oleh Sistem Damkar dan sedang menunggu verifikasi petugas.`;

    return res.status(201).json({
      success: true,
      message: 'Laporan kejadian kebakaran berhasil terkirim!',
      autoResponse: autoResponseMsg,
      data: newLaporan
    });

  } catch (error) {
    console.error('Error creating laporan:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    const dbErr = parseDbError(error);
    return res.status(500).json({
      success: false,
      message: dbErr || 'Gagal mengirimkan laporan. Terjadi kesalahan pada server.'
    });
  }
};

// 2. Get Semua Laporan (Admin & Beranda Stats)
const getAllLaporan = async (req, res) => {
  try {
    const { search, status, startDate, endDate, kabupaten, kecamatan, jenis } = req.query;

    let whereText = ' WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (search) {
      whereText += ` AND (judul_kejadian LIKE $${paramIndex} OR nama_pelapor LIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status && status !== 'Semua') {
      whereText += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (startDate) {
      whereText += ` AND created_at >= $${paramIndex}`;
      params.push(`${startDate} 00:00:00`);
      paramIndex++;
    }

    if (endDate) {
      whereText += ` AND created_at <= $${paramIndex}`;
      params.push(`${endDate} 23:59:59`);
      paramIndex++;
    }

    if (kabupaten) {
      whereText += ` AND kabupaten LIKE $${paramIndex}`;
      params.push(`%${kabupaten}%`);
      paramIndex++;
    }

    if (kecamatan) {
      whereText += ` AND kecamatan LIKE $${paramIndex}`;
      params.push(`%${kecamatan}%`);
      paramIndex++;
    }

    if (jenis) {
      whereText += ` AND jenis_kejadian LIKE $${paramIndex}`;
      params.push(`%${jenis}%`);
      paramIndex++;
    }

    const queryText = `SELECT * FROM laporan${whereText} ORDER BY created_at DESC`;

    try {
      const result = await db.query(queryText, params);

      const statsQuery = await db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'Menunggu' THEN 1 END) as menunggu,
          COUNT(CASE WHEN status = 'Diproses' THEN 1 END) as diproses,
          COUNT(CASE WHEN status = 'Selesai' THEN 1 END) as selesai
        FROM laporan${whereText}
      `, params);

      const stats = statsQuery.rows[0] || {};

      const rowsData = result.rows || [];

      return res.status(200).json({
        success: true,
        stats: {
          total: parseInt(stats.total, 10) || 0,
          menunggu: parseInt(stats.menunggu, 10) || 0,
          diproses: parseInt(stats.diproses, 10) || 0,
          selesai: parseInt(stats.selesai, 10) || 0
        },
        data: rowsData
      });

    } catch (dbErr) {
      console.error('Database query failed for getAllLaporan:', dbErr);
      return res.status(500).json({
        success: false,
        message: 'Gagal mengambil data laporan dari database.'
      });
    }

  } catch (error) {
    console.error('Error fetching laporan:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data laporan.'
    });
  }
};

// 3. Get Laporan By ID
const getLaporanById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM laporan WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Laporan tidak ditemukan.'
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching single laporan:', error);
    const dbErr = parseDbError(error);
    return res.status(500).json({
      success: false,
      message: dbErr || 'Terjadi kesalahan saat mengambil rincian laporan.'
    });
  }
};

// 4. Update Status / Data Laporan (Admin)
const updateLaporan = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, judul_kejadian, nama_pelapor, nomor_hp, alamat, deskripsi, respon_admin } = req.body;

    const checkReport = await db.query('SELECT * FROM laporan WHERE id = $1', [id]);
    if (checkReport.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Laporan tidak ditemukan.'
      });
    }

    const currentReport = checkReport.rows[0];

    const newStatus = status || currentReport.status;
    const newJudul = judul_kejadian || currentReport.judul_kejadian;
    const newNama = nama_pelapor || currentReport.nama_pelapor;
    const newHp = nomor_hp || currentReport.nomor_hp;
    const newAlamat = alamat || currentReport.alamat;
    const newDeskripsi = deskripsi || currentReport.deskripsi;
    const newResponse = respon_admin !== undefined ? respon_admin : currentReport.respon_admin;

    let foto = currentReport.foto;
    if (req.file) {
      if (currentReport.foto) {
        const oldPath = path.join(__dirname, '../uploads', currentReport.foto);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      foto = req.file.filename;
    }

    const updateQuery = `
      UPDATE laporan 
      SET status = $1, 
          judul_kejadian = $2, 
          nama_pelapor = $3, 
          nomor_hp = $4, 
          alamat = $5, 
          deskripsi = $6, 
          respon_admin = $7,
          foto = $8, 
          updated_at = NOW()
      WHERE id = $9
    `;

    await db.query(updateQuery, [
      newStatus,
      newJudul,
      newNama,
      newHp,
      newAlamat,
      newDeskripsi,
      newResponse,
      foto,
      id
    ]);

    const updatedResult = await db.query('SELECT * FROM laporan WHERE id = $1', [id]);

    return res.status(200).json({
      success: true,
      message: 'Status dan data laporan berhasil diperbarui.',
      data: updatedResult.rows[0]
    });

  } catch (error) {
    console.error('Error updating laporan:', error);
    const dbErr = parseDbError(error);
    return res.status(500).json({
      success: false,
      message: dbErr || 'Gagal memperbarui laporan.'
    });
  }
};

// 5. Delete Laporan (Admin)
const deleteLaporan = async (req, res) => {
  try {
    const { id } = req.params;

    const checkReport = await db.query('SELECT * FROM laporan WHERE id = $1', [id]);
    if (checkReport.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Laporan tidak ditemukan.'
      });
    }

    const report = checkReport.rows[0];
    if (report.foto) {
      const filePath = path.join(__dirname, '../uploads', report.foto);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await db.query('DELETE FROM laporan WHERE id = $1', [id]);

    return res.status(200).json({
      success: true,
      message: 'Laporan berhasil dihapus.'
    });

  } catch (error) {
    console.error('Error deleting laporan:', error);
    const dbErr = parseDbError(error);
    return res.status(500).json({
      success: false,
      message: dbErr || 'Gagal menghapus laporan.'
    });
  }
};

module.exports = {
  createLaporan,
  getAllLaporan,
  getLaporanById,
  updateLaporan,
  deleteLaporan
};
