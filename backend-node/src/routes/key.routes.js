const express = require('express');
const router = express.Router();

const keyController = require('../controllers/key.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { generalApiLimiter } = require('../middleware/rateLimiter');

router.post('/register', [authMiddleware, generalApiLimiter], keyController.registerKey);
router.get('/:userId', [authMiddleware, generalApiLimiter], keyController.getUserKey);
router.get('/me/current', [authMiddleware, generalApiLimiter], keyController.getMyPublicKey);
router.delete('/clear', [authMiddleware, generalApiLimiter], keyController.deleteUserKey);

module.exports = router;
