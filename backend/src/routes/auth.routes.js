const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/request-otp', authController.requestSignupOtp);
router.post('/verify-otp', authController.verifyOtp);
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/forgot-password', authController.requestPasswordResetOtp);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
