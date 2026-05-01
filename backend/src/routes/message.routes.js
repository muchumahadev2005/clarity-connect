const express = require('express');
const router = express.Router();

const messageController = require('../controllers/message.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { messageLimiter } = require('../middleware/rateLimiter');

router.post('/', [authMiddleware, messageLimiter], messageController.sendMessage);
router.get('/inbox', authMiddleware, messageController.getInbox);
router.get('/outbox', authMiddleware, messageController.getOutbox);
router.post('/:id/view', messageController.markViewed); // Public for shared links
router.delete('/:id', authMiddleware, messageController.deleteMessage);

module.exports = router;
