const express = require('express');
const router = express.Router();

const keyController = require('../controllers/key.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.post('/register', authMiddleware, keyController.registerKey);
router.get('/:userId', authMiddleware, keyController.getUserKey);

module.exports = router;
