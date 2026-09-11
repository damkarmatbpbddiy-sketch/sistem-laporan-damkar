const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username dan password wajib diisi.'
      });
    }

    const result = await db.query('SELECT * FROM admin WHERE username = $1', [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah.'
      });
    }

    const admin = result.rows[0];

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah.'
      });
    }

    const secret = process.env.JWT_SECRET || 'damkar_jwt_secret_key_production_2026';
    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: 'admin' },
      secret,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login berhasil.',
      token,
      admin: {
        id: admin.id,
        username: admin.username
      }
    });

  } catch (error) {
    console.error('Error on login:', error);
    let errMsg = 'Terjadi kesalahan pada server saat login.';
    if (error.code === '28P01') {
      errMsg = 'Koneksi Database Gagal: Password PostgreSQL salah. Harap sesuaikan DB_PASSWORD di backend/.env';
    } else if (error.code === '3D000') {
      errMsg = 'Koneksi Database Gagal: Database "damkar_db" belum dibuat. Harap jalankan "npm run seed".';
    } else if (error.code === 'ECONNREFUSED') {
      errMsg = 'Koneksi Database Gagal: PostgreSQL server tidak aktif.';
    }

    return res.status(500).json({
      success: false,
      message: errMsg
    });
  }
};

module.exports = {
  login
};
