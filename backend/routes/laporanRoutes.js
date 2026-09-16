const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const laporanController = require('../controllers/laporanController');
const verifyToken = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { reportRateLimiter } = require('../middleware/securityMiddleware');

// Validasi input laporan
const validateLaporan = [
  body('judul_kejadian').trim().notEmpty().withMessage('Judul kejadian wajib diisi.'),
  body('nama_pelapor').optional({ values: 'falsy' }),
  body('nomor_hp').optional({ values: 'falsy' }),
  body('alamat').trim().notEmpty().withMessage('Lokasi/Alamat kejadian wajib diisi.'),
  body('deskripsi').optional({ values: 'falsy' }),
  body('latitude').optional({ values: 'falsy' }),
  body('longitude').optional({ values: 'falsy' })
];

// Public Endpoints
router.post('/laporan', reportRateLimiter, upload.single('foto'), validateLaporan, laporanController.createLaporan);
router.get('/laporan', laporanController.getAllLaporan);
router.get('/laporan/:id', laporanController.getLaporanById);

// Admin Protected Endpoints
router.put('/laporan/:id', verifyToken, upload.single('foto'), laporanController.updateLaporan);
router.delete('/laporan/:id', verifyToken, laporanController.deleteLaporan);

module.exports = router;
