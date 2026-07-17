import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load env variables
dotenv.config();

import authRouter from './features/auth/auth.router';
import policyRouter from './features/policy/policy.router';
import groupRouter from './features/group/group.router';
import userRouter from './features/user/user.router';
import reportsRouter from './features/reports/reports.router';
import alertsRouter from './features/alerts/alerts.router';
import settingsRouter from './features/settings/settings.router';
import auditRouter from './features/audit/audit.router';
import { errorResponse } from './shared/utils/response';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Feature Routes
app.use('/api/auth', authRouter);
app.use('/api/iam/policies', policyRouter);
app.use('/api/iam/groups', groupRouter);
app.use('/api/iam/users', userRouter);

// Dummy Resource Routes
app.use('/api/reports', reportsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/audit', auditRouter);

// Base route status
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// 404 Route handler
app.use((req: Request, res: Response, next: NextFunction) => {
  return errorResponse(res, 404, `Endpoint ${req.originalUrl} not found.`);
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error details:', err);
  const status = err.statusCode || 500;
  const message = err.message || 'An unexpected error occurred.';
  return errorResponse(res, status, message);
});

export default app;
