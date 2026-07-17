import express, { Request, Response } from 'express';
import authMiddleware from '../../middleware/auth.middleware';
import iamMiddleware from '../../middleware/iam.middleware';
import prisma from '../../config/db';
import { successResponse, errorResponse } from '../../shared/utils/response';

const router = express.Router();

router.use(authMiddleware);

// 1. List Audit Logs
router.get('/', iamMiddleware('audit:List'), async (req: Request, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' }
    });
    return successResponse(res, 200, logs);
  } catch (error: any) {
    console.error('List audit logs error:', error);
    return errorResponse(res, 500, 'Failed to fetch audit logs.');
  }
});

// 2. View Audit Log Details
router.get('/:id', iamMiddleware('audit:Read'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const log = await prisma.auditLog.findUnique({
      where: { id }
    });
    if (!log) {
      return errorResponse(res, 404, 'Audit log entry not found.');
    }
    return successResponse(res, 200, log);
  } catch (error: any) {
    console.error('Read audit log error:', error);
    return errorResponse(res, 500, 'Failed to fetch audit log details.');
  }
});

export default router;
