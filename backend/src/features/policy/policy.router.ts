import express from 'express';
import * as policyController from './policy.controller';
import authMiddleware from '../../middleware/auth.middleware';
import iamMiddleware from '../../middleware/iam.middleware';
import validate from '../../middleware/validate.middleware';
import { createPolicySchema, updatePolicySchema } from './policy.schema';

const router = express.Router();

router.post('/', authMiddleware, iamMiddleware('iam:CreatePolicy'), validate(createPolicySchema), policyController.createPolicy);
router.get('/', authMiddleware, iamMiddleware('iam:ListPolicies'), policyController.listPolicies);
router.get('/:id', authMiddleware, iamMiddleware('iam:GetPolicy'), policyController.getPolicy);
router.put('/:id', authMiddleware, iamMiddleware('iam:UpdatePolicy'), validate(updatePolicySchema), policyController.updatePolicy);
router.delete('/:id', authMiddleware, iamMiddleware('iam:DeletePolicy'), policyController.deletePolicy);

export default router;
