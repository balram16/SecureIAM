import express, { Request, Response } from 'express';
import authMiddleware from '../../middleware/auth.middleware';
import iamMiddleware from '../../middleware/iam.middleware';

const router = express.Router();

router.use(authMiddleware);

const dummyHandler = (req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    message: 'OK'
  });
};

router.get('/', iamMiddleware('settings:Read'), dummyHandler);
router.put('/', iamMiddleware('settings:Update'), dummyHandler);

export default router;
