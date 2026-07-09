const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const mailController = require('../controllers/mail.controller');

router.post('/send-email', authMiddleware, mailController.sendEmail);

module.exports = router;
