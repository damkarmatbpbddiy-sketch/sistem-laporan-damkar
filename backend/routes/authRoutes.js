const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { loginRateLimiter } = require('../middleware/securityMiddleware');

router.post('/login', loginRateLimiter, authController.login);

module.exports = router;
