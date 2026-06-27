const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load env variables
dotenv.config();
const authRouter = require('./features/auth/auth.router');
const policyRouter = require('./features/policy/policy.router');
const groupRouter = require('./features/group/group.router');
const userRouter = require('./features/user/user.router');
const reportsRouter = require('./features/reports/reports.router');
const alertsRouter = require('./features/alerts/alerts.router');
const settingsRouter = require('./features/settings/settings.router');
const auditRouter = require('./features/audit/audit.router');
const { errorResponse } = require('./shared/utils/response');

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
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// 404 Route handler
app.use((req, res, next) => {
  return errorResponse(res, 404, `Endpoint ${req.originalUrl} not found.`);
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled error details:', err);
  const status = err.statusCode || 500;
  const message = err.message || 'An unexpected error occurred.';
  return errorResponse(res, status, message);
});

module.exports = app;
