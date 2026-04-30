const express = require('express');
const router = express.Router();

const messageController = require('../controllers/message.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.post('/', authMiddleware, messageController.sendMessage);
router.get('/inbox', authMiddleware, messageController.getInbox);
router.get('/outbox', authMiddleware, messageController.getOutbox);
router.delete('/:id', authMiddleware, messageController.deleteMessage);

module.exports = router;
