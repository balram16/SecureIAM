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

router.get('/', iamMiddleware('alerts:List'), dummyHandler);
router.get('/:id', iamMiddleware('alerts:Read'), dummyHandler);
router.post('/', iamMiddleware('alerts:Create'), dummyHandler);
router.patch('/:id/acknowledge', iamMiddleware('alerts:Acknowledge'), dummyHandler);
router.delete('/:id', iamMiddleware('alerts:Delete'), dummyHandler);

module.exports = router;
