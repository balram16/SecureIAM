const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth.middleware');
const iamMiddleware = require('../../middleware/iam.middleware');

router.use(authMiddleware);

const dummyHandler = (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'OK'
  });
};

router.get('/', iamMiddleware('settings:Read'), dummyHandler);
router.put('/', iamMiddleware('settings:Update'), dummyHandler);

module.exports = router;
