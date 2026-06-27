const express = require('express');
const router = express.Router();
const policyController = require('./policy.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const iamMiddleware = require('../../middleware/iam.middleware');

router.use(authMiddleware);

router.post('/', iamMiddleware('iam:CreatePolicy'), policyController.createPolicy);
router.get('/', iamMiddleware('iam:ListPolicies'), policyController.listPolicies);
router.get('/:id', iamMiddleware('iam:GetPolicy'), policyController.getPolicy);
router.put('/:id', iamMiddleware('iam:UpdatePolicy'), policyController.updatePolicy);
router.delete('/:id', iamMiddleware('iam:DeletePolicy'), policyController.deletePolicy);

module.exports = router;
