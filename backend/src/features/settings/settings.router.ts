import express, { Request, Response } from 'express';
import authMiddleware from '../../middleware/auth.middleware';
import iamMiddleware from '../../middleware/iam.middleware';
import prisma from '../../config/db';
import { logAudit } from '../../shared/utils/audit.logger';
import { successResponse, errorResponse } from '../../shared/utils/response';

const router = express.Router();

router.use(authMiddleware);

// 1. Read Global Settings
router.get('/', iamMiddleware('settings:Read'), async (req: Request, res: Response) => {
  try {
    let settings = await prisma.setting.findUnique({
      where: { id: 'global' }
    });

    // Auto-initialize if database seed was skipped
    if (!settings) {
      settings = await prisma.setting.create({
        data: {
          id: 'global',
          sessionTimeout: 30,
          mfaRequired: false,
          allowedIps: '127.0.0.1, 192.168.1.1',
          updatedBy: 'System'
        }
      });
    }

    return successResponse(res, 200, settings);
  } catch (error: any) {
    console.error('Read settings error:', error);
    return errorResponse(res, 500, 'Failed to fetch global settings.');
  }
});

// 2. Update Global Settings
router.put('/', iamMiddleware('settings:Update'), async (req: Request, res: Response) => {
  try {
    const { sessionTimeout, mfaRequired, allowedIps } = req.body;

    const dataToUpdate: any = {
      updatedBy: req.user!.email || req.user!.name || 'System'
    };

    if (sessionTimeout !== undefined) {
      const timeout = parseInt(sessionTimeout, 10);
      if (isNaN(timeout) || timeout <= 0) {
        return errorResponse(res, 400, 'Session timeout must be a positive integer.');
      }
      dataToUpdate.sessionTimeout = timeout;
    }

    if (mfaRequired !== undefined) {
      dataToUpdate.mfaRequired = !!mfaRequired;
    }

    if (allowedIps !== undefined) {
      dataToUpdate.allowedIps = allowedIps.trim();
    }

    const updatedSettings = await prisma.setting.upsert({
      where: { id: 'global' },
      update: dataToUpdate,
      create: {
        id: 'global',
        sessionTimeout: dataToUpdate.sessionTimeout || 30,
        mfaRequired: dataToUpdate.mfaRequired || false,
        allowedIps: dataToUpdate.allowedIps || '*',
        updatedBy: dataToUpdate.updatedBy
      }
    });

    await logAudit(
      req.user!.id,
      req.user!.name || req.user!.email,
      'settings:Update',
      `Updated global system settings (Timeout: ${updatedSettings.sessionTimeout}m, MFA: ${updatedSettings.mfaRequired})`
    );

    return successResponse(res, 200, updatedSettings);
  } catch (error: any) {
    console.error('Update settings error:', error);
    return errorResponse(res, 500, 'Failed to update global settings.');
  }
});

export default router;
