import prisma from '../../config/db';

/**
 * Creates an entry in the system audit compliance ledger log table
 */
export const logAudit = async (userId: string, userName: string, action: string, details: string) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        userName,
        action,
        details
      }
    });
  } catch (error) {
    console.error('Failed to log audit activity:', error);
  }
};
