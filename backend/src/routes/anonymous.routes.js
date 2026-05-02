const express = require('express');
const router = express.Router();
const anonymousController = require('../controllers/anonymous.controller');
const { sendAnonymousEmailLimiter } = require('../middleware/rateLimiter');

// Send anonymous email (no authentication required)
router.post('/send', sendAnonymousEmailLimiter, anonymousController.sendAnonymous);

module.exports = router;
