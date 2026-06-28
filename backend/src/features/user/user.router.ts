import express from 'express';
import * as userController from './user.controller';
import authMiddleware from '../../middleware/auth.middleware';
import iamMiddleware from '../../middleware/iam.middleware';
import validate from '../../middleware/validate.middleware';
import { attachPolicySchema, putBoundarySchema } from './user.schema';

const router = express.Router();

router.get('/', authMiddleware, iamMiddleware('iam:ListUsers'), userController.listUsers);
router.get('/:id', authMiddleware, iamMiddleware('iam:GetUser'), userController.getUser);

// User direct policies
router.post('/:id/policies', authMiddleware, iamMiddleware('iam:AttachUserPolicy'), validate(attachPolicySchema), userController.attachPolicy);
router.delete('/:id/policies/:policyId', authMiddleware, iamMiddleware('iam:DetachUserPolicy'), userController.detachPolicy);

// User permission boundaries
router.put('/:id/boundary', authMiddleware, iamMiddleware('iam:PutUserBoundary'), validate(putBoundarySchema), userController.putBoundary);
router.delete('/:id/boundary', authMiddleware, iamMiddleware('iam:DeleteUserBoundary'), userController.deleteBoundary);

export default router;
