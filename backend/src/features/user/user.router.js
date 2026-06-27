const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const iamMiddleware = require('../../middleware/iam.middleware');

router.use(authMiddleware);

router.get('/', iamMiddleware('iam:ListUsers'), userController.listUsers);
router.get('/:id', iamMiddleware('iam:GetUser'), userController.getUser);

const validate = require('../../middleware/validate.middleware');
const { attachPolicySchema, putBoundarySchema } = require('./user.schema');

// User Direct Policies
router.post('/:id/policies', iamMiddleware('iam:AttachUserPolicy'), validate(attachPolicySchema), userController.attachPolicy);
router.delete('/:id/policies/:policyId', iamMiddleware('iam:DetachUserPolicy'), userController.detachPolicy);

// User Permission Boundary (only callable by Root, verified inside controller + iamMiddleware)
router.put('/:id/boundary', iamMiddleware('iam:PutUserBoundary'), validate(putBoundarySchema), userController.putBoundary);
router.delete('/:id/boundary', iamMiddleware('iam:DeleteUserBoundary'), userController.deleteBoundary);

module.exports = router;
