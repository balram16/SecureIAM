import express from 'express';
import * as groupController from './group.controller';
import authMiddleware from '../../middleware/auth.middleware';
import iamMiddleware from '../../middleware/iam.middleware';
import validate from '../../middleware/validate.middleware';
import { createGroupSchema, addUserSchema, attachPolicySchema } from './group.schema';

const router = express.Router();

router.post('/', authMiddleware, iamMiddleware('iam:CreateGroup'), validate(createGroupSchema), groupController.createGroup);
router.get('/', authMiddleware, iamMiddleware('iam:ListGroups'), groupController.listGroups);
router.get('/:id', authMiddleware, iamMiddleware('iam:GetGroup'), groupController.getGroup);
router.put('/:id', authMiddleware, iamMiddleware('iam:UpdateGroup'), validate(createGroupSchema), groupController.updateGroup);
router.delete('/:id', authMiddleware, iamMiddleware('iam:DeleteGroup'), groupController.deleteGroup);

// Group Memberships
router.post('/:id/members', authMiddleware, iamMiddleware('iam:AddUserToGroup'), validate(addUserSchema), groupController.addUser);
router.delete('/:id/members/:userId', authMiddleware, iamMiddleware('iam:RemoveUserFromGroup'), groupController.removeUser);

// Group Policies
router.post('/:id/policies', authMiddleware, iamMiddleware('iam:AttachGroupPolicy'), validate(attachPolicySchema), groupController.attachPolicy);
router.delete('/:id/policies/:policyId', authMiddleware, iamMiddleware('iam:DetachGroupPolicy'), groupController.detachPolicy);

export default router;
