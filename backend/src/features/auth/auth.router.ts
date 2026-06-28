import express from 'express';
import * as authController from './auth.controller';
import authMiddleware from '../../middleware/auth.middleware';
import validate from '../../middleware/validate.middleware';
import { registerSchema, loginSchema, refreshSchema } from './auth.schema';

const router = express.Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/logout', authMiddleware, authController.logout);
router.get('/me', authMiddleware, authController.me);

export default router;
