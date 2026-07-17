import express, { Request, Response } from 'express';
import authMiddleware from '../../middleware/auth.middleware';
import iamMiddleware from '../../middleware/iam.middleware';
import prisma from '../../config/db';
import { logAudit } from '../../shared/utils/audit.logger';
import { successResponse, errorResponse } from '../../shared/utils/response';
import { evaluatePermission } from '../../shared/utils/permission.utils';

const router = express.Router();

router.use(authMiddleware);

// 1. List Reports
router.get('/', iamMiddleware('reports:List'), async (req: Request, res: Response) => {
  try {
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const filtered = reports.filter(report =>
      evaluatePermission(req.user!, 'reports:Read', `reports:${report.id}`)
    );

    return successResponse(res, 200, filtered);
  } catch (error: any) {
    console.error('List reports error:', error);
    return errorResponse(res, 500, 'Failed to fetch reports.');
  }
});

// 2. Read Report Details
router.get('/:id', iamMiddleware('reports:Read'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const report = await prisma.report.findUnique({
      where: { id }
    });
    if (!report) {
      return errorResponse(res, 404, 'Report not found.');
    }
    return successResponse(res, 200, report);
  } catch (error: any) {
    console.error('Read report error:', error);
    return errorResponse(res, 500, 'Failed to fetch report details.');
  }
});

// 3. Create Report
router.post('/', iamMiddleware('reports:Create'), async (req: Request, res: Response) => {
  try {
    const { name, category, description } = req.body;
    if (!name || !category) {
      return errorResponse(res, 400, 'Name and category are required.');
    }

    const creator = req.user?.name || req.user?.email || 'Anonymous';
    const newReport = await prisma.report.create({
      data: {
        name: name.trim(),
        category: category.trim(),
        description: description ? description.trim() : null,
        createdBy: creator
      }
    });

    await logAudit(
      req.user!.id,
      req.user!.name || req.user!.email,
      'reports:Create',
      `Created report '${newReport.name}' (Category: ${newReport.category})`
    );

    return successResponse(res, 201, newReport);
  } catch (error: any) {
    console.error('Create report error:', error);
    return errorResponse(res, 500, 'Failed to create report.');
  }
});

// 4. Update Report
router.put('/:id', iamMiddleware('reports:Update'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { name, category, description } = req.body;

    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) {
      return errorResponse(res, 404, 'Report not found.');
    }

    const updatedData: any = {};
    if (name !== undefined) updatedData.name = name.trim();
    if (category !== undefined) updatedData.category = category.trim();
    if (description !== undefined) updatedData.description = description ? description.trim() : null;

    const updatedReport = await prisma.report.update({
      where: { id },
      data: updatedData
    });

    await logAudit(
      req.user!.id,
      req.user!.name || req.user!.email,
      'reports:Update',
      `Updated report '${report.name}' to name: '${updatedReport.name}'`
    );

    return successResponse(res, 200, updatedReport);
  } catch (error: any) {
    console.error('Update report error:', error);
    return errorResponse(res, 500, 'Failed to update report.');
  }
});

// 5. Delete Report
router.delete('/:id', iamMiddleware('reports:Delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) {
      return errorResponse(res, 404, 'Report not found.');
    }

    await prisma.report.delete({ where: { id } });

    await logAudit(
      req.user!.id,
      req.user!.name || req.user!.email,
      'reports:Delete',
      `Deleted report '${report.name}'`
    );

    return successResponse(res, 200, { message: 'Report deleted successfully.' });
  } catch (error: any) {
    console.error('Delete report error:', error);
    return errorResponse(res, 500, 'Failed to delete report.');
  }
});

export default router;
