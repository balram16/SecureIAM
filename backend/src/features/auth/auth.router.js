const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const authMiddleware = require('../../middleware/auth.middleware');

const validate = require('../../middleware/validate.middleware');
const { registerSchema, loginSchema } = require('./auth.schema');

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.get('/me', authMiddleware, authController.me);

module.exports = router;
