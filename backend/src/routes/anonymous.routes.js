const express = require('express');
const router = express.Router();
const anonymousController = require('../controllers/anonymous.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { sendAnonymousEmailLimiter, generalApiLimiter } = require('../middleware/rateLimiter');

// Send anonymous email (no authentication required)
router.post('/send', sendAnonymousEmailLimiter, anonymousController.sendAnonymous);

// Generate or retrieve alias (requires authentication)
router.post('/generate-alias', [authMiddleware, generalApiLimiter], anonymousController.generateOrGetAlias);

// Get inbox messages (requires authentication)
router.get('/inbox', authMiddleware, anonymousController.getInbox);

// Mark message as read (requires authentication)
router.post('/mark-read/:id', authMiddleware, anonymousController.markRead);

module.exports = router;

