const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth.middleware');
const iamMiddleware = require('../../middleware/iam.middleware');
const { successResponse } = require('../../shared/utils/response');

router.use(authMiddleware);

// Define dummy handlers that return { success: true, data: { message: "OK" } }
// Note: successResponse returns { success: true, data: ... } 
// But the assignment states: { "success": true, "message": "OK" }
// Let's write a small helper or manually return res.status(200).json({ success: true, message: 'OK' }) to match exactly!
// Page 7 OCR: { "success": true, "message": "OK" } with HTTP status 200.
const dummyHandler = (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'OK'
  });
};

router.get('/', iamMiddleware('reports:List'), dummyHandler);
router.get('/:id', iamMiddleware('reports:Read'), dummyHandler);
router.post('/', iamMiddleware('reports:Create'), dummyHandler);
router.put('/:id', iamMiddleware('reports:Update'), dummyHandler);
router.delete('/:id', iamMiddleware('reports:Delete'), dummyHandler);

module.exports = router;
