const express = require('express');
const { authenticate, authorizeAdmin } = require('../middlewares/authMiddleware');
const { getReports, getStats } = require('../controllers/adminController');

const router = express.Router();

router.get('/reports', authenticate, authorizeAdmin, getReports);
router.get('/stats', authenticate, authorizeAdmin, getStats);

module.exports = router;
