const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const laporanController = require('../controllers/laporanController');
const verifyToken = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Validasi input laporan
const validateLaporan = [
  body('judul_kejadian').trim().notEmpty().withMessage('Judul kejadian wajib diisi.'),
  body('nama_pelapor').trim().notEmpty().withMessage('Nama pelapor wajib diisi.'),
  body('nomor_hp').trim().matches(/^[0-9+() .-]{8,20}$/).withMessage('Nomor HP tidak valid.'),
  body('alamat').trim().notEmpty().withMessage('Lokasi/Alamat kejadian wajib diisi.'),
  body('deskripsi').trim().isLength({ min: 5, max: 5000 }).withMessage('Deskripsi harus berisi 5-5000 karakter.'),
  body('latitude').optional({ values: 'falsy' }).isFloat({ min: -90, max: 90 }).withMessage('Latitude tidak valid.'),
  body('longitude').optional({ values: 'falsy' }).isFloat({ min: -180, max: 180 }).withMessage('Longitude tidak valid.')
];

// Public Endpoints
router.post('/laporan', upload.single('foto'), validateLaporan, laporanController.createLaporan);
router.get('/laporan', laporanController.getAllLaporan);
router.get('/laporan/:id', laporanController.getLaporanById);

// Admin Protected Endpoints
router.put('/laporan/:id', verifyToken, upload.single('foto'), laporanController.updateLaporan);
router.delete('/laporan/:id', verifyToken, laporanController.deleteLaporan);

module.exports = router;
