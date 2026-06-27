const express = require('express');
const router = express.Router();
const groupController = require('./group.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const iamMiddleware = require('../../middleware/iam.middleware');

router.use(authMiddleware);

router.post('/', iamMiddleware('iam:CreateGroup'), groupController.createGroup);
router.get('/', iamMiddleware('iam:ListGroups'), groupController.listGroups);
router.get('/:id', iamMiddleware('iam:GetGroup'), groupController.getGroup);
router.put('/:id', iamMiddleware('iam:UpdateGroup'), groupController.updateGroup);
router.delete('/:id', iamMiddleware('iam:DeleteGroup'), groupController.deleteGroup);

// Memberships
router.post('/:id/members', iamMiddleware('iam:AddUserToGroup'), groupController.addUser);
router.delete('/:id/members/:userId', iamMiddleware('iam:RemoveUserFromGroup'), groupController.removeUser);

// Policies
router.post('/:id/policies', iamMiddleware('iam:AttachGroupPolicy'), groupController.attachPolicy);
router.delete('/:id/policies/:policyId', iamMiddleware('iam:DetachGroupPolicy'), groupController.detachPolicy);

module.exports = router;
