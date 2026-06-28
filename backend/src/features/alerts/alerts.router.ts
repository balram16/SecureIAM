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

router.get('/', iamMiddleware('alerts:List'), dummyHandler);
router.get('/:id', iamMiddleware('alerts:Read'), dummyHandler);
router.post('/', iamMiddleware('alerts:Create'), dummyHandler);
router.patch('/:id/acknowledge', iamMiddleware('alerts:Acknowledge'), dummyHandler);
router.delete('/:id', iamMiddleware('alerts:Delete'), dummyHandler);

export default router;
