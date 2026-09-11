const express = require('express');
const router = express.Router();
const silakarController = require('../controllers/silakarController');
const verifyToken = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Public - baca data
router.get('/', silakarController.getAllSilakar);
router.get('/:id', silakarController.getSilakarById);

// Admin only - create, update, delete
router.post('/', verifyToken, upload.single('dokumentasi'), silakarController.createSilakar);
router.put('/:id', verifyToken, upload.single('dokumentasi'), silakarController.updateSilakar);
router.delete('/:id', verifyToken, silakarController.deleteSilakar);

module.exports = router;
