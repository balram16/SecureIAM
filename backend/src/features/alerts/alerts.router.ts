import express, { Request, Response } from 'express';
import authMiddleware from '../../middleware/auth.middleware';
import iamMiddleware from '../../middleware/iam.middleware';
import prisma from '../../config/db';
import { logAudit } from '../../shared/utils/audit.logger';
import { successResponse, errorResponse } from '../../shared/utils/response';
import { evaluatePermission } from '../../shared/utils/permission.utils';

const router = express.Router();

router.use(authMiddleware);

// 1. List Alerts
router.get('/', iamMiddleware('alerts:List'), async (req: Request, res: Response) => {
  try {
    const alerts = await prisma.alert.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const filtered = alerts.filter(alert =>
      evaluatePermission(req.user!, 'alerts:Read', `alerts:${alert.id}`)
    );

    return successResponse(res, 200, filtered);
  } catch (error: any) {
    console.error('List alerts error:', error);
    return errorResponse(res, 500, 'Failed to fetch alerts.');
  }
});

// 2. Read Alert Details
router.get('/:id', iamMiddleware('alerts:Read'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const alert = await prisma.alert.findUnique({
      where: { id }
    });
    if (!alert) {
      return errorResponse(res, 404, 'Alert not found.');
    }
    return successResponse(res, 200, alert);
  } catch (error: any) {
    console.error('Read alert error:', error);
    return errorResponse(res, 500, 'Failed to fetch alert details.');
  }
});

// 3. Create Alert
router.post('/', iamMiddleware('alerts:Create'), async (req: Request, res: Response) => {
  try {
    const { title, severity } = req.body;
    if (!title || !severity) {
      return errorResponse(res, 400, 'Title and severity are required.');
    }

    const newAlert = await prisma.alert.create({
      data: {
        title: title.trim(),
        severity: severity.trim()
      }
    });

    await logAudit(
      req.user!.id,
      req.user!.name || req.user!.email,
      'alerts:Create',
      `Created alert '${newAlert.title}' (Severity: ${newAlert.severity})`
    );

    return successResponse(res, 201, newAlert);
  } catch (error: any) {
    console.error('Create alert error:', error);
    return errorResponse(res, 500, 'Failed to create alert.');
  }
});

// 4. Acknowledge Alert
router.patch('/:id/acknowledge', iamMiddleware('alerts:Acknowledge'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const alert = await prisma.alert.findUnique({ where: { id } });
    if (!alert) {
      return errorResponse(res, 404, 'Alert not found.');
    }

    const updatedAlert = await prisma.alert.update({
      where: { id },
      data: { acknowledged: true }
    });

    await logAudit(
      req.user!.id,
      req.user!.name || req.user!.email,
      'alerts:Acknowledge',
      `Acknowledged alert '${alert.title}'`
    );

    return successResponse(res, 200, updatedAlert);
  } catch (error: any) {
    console.error('Acknowledge alert error:', error);
    return errorResponse(res, 500, 'Failed to acknowledge alert.');
  }
});

// 5. Delete Alert
router.delete('/:id', iamMiddleware('alerts:Delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const alert = await prisma.alert.findUnique({ where: { id } });
    if (!alert) {
      return errorResponse(res, 404, 'Alert not found.');
    }

    await prisma.alert.delete({ where: { id } });

    await logAudit(
      req.user!.id,
      req.user!.name || req.user!.email,
      'alerts:Delete',
      `Resolved/Deleted alert '${alert.title}'`
    );

    return successResponse(res, 200, { message: 'Alert resolved successfully.' });
  } catch (error: any) {
    console.error('Delete alert error:', error);
    return errorResponse(res, 500, 'Failed to delete alert.');
  }
});

export default router;
