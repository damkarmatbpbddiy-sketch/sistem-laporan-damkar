const express = require('express');
const router = express.Router();
const arsipController = require('../controllers/arsipController');
const verifyToken = require('../middleware/authMiddleware');
const uploadArsip = require('../middleware/uploadArsipMiddleware');

// Public / Fetch Endpoints
router.get('/', arsipController.getAllArsip);
router.get('/statistik', arsipController.getArsipStatistik);

// Folder Endpoints (Admin Operations)
router.get('/folders', arsipController.getAllFolders);
router.post('/folders', verifyToken, arsipController.createFolder);
router.put('/folders/rename', verifyToken, arsipController.renameFolder);
router.delete('/folders/:nama_folder', verifyToken, arsipController.deleteFolder);
router.get('/:id', arsipController.getArsipById);
router.get('/:id/download', arsipController.downloadArsip);
router.post('/', verifyToken, uploadArsip.single('file'), arsipController.uploadArsip);
router.put('/batch-folder', verifyToken, arsipController.updateArsipFolder);
router.delete('/:id', verifyToken, arsipController.deleteArsip);

module.exports = router;
