const express = require('express');
const router = express.Router();

const messageController = require('../controllers/message.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { messageLimiter, generalApiLimiter, publicMessageLimiter } = require('../middleware/rateLimiter');

router.post('/', [authMiddleware, messageLimiter], messageController.sendMessage);
router.get('/inbox', [authMiddleware, generalApiLimiter], messageController.getInbox);
router.get('/outbox', [authMiddleware, generalApiLimiter], messageController.getOutbox);
router.get('/:id', publicMessageLimiter, messageController.getMessageById); // Public GET for shared links
router.post('/:id/view', publicMessageLimiter, messageController.markViewed); // Public for shared links
router.delete('/:id', [authMiddleware, generalApiLimiter], messageController.deleteMessage);

module.exports = router;
