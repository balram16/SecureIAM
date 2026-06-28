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

router.get('/', iamMiddleware('reports:List'), dummyHandler);
router.get('/:id', iamMiddleware('reports:Read'), dummyHandler);
router.post('/', iamMiddleware('reports:Create'), dummyHandler);
router.put('/:id', iamMiddleware('reports:Update'), dummyHandler);
router.delete('/:id', iamMiddleware('reports:Delete'), dummyHandler);

export default router;
