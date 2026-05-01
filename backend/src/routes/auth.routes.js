const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/request-otp', authLimiter, authController.requestSignupOtp);
router.post('/verify-otp', authLimiter, authController.verifyOtp);
router.post('/signup', authLimiter, authController.signup);
router.post('/login', authLimiter, authController.login);
router.post('/forgot-password', authLimiter, authController.requestPasswordResetOtp);
router.post('/reset-password', authLimiter, authController.resetPassword);

module.exports = router;
