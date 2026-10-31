import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware.js';
import { authenticate } from './middleware/auth.middleware.js';
import { requireRoles } from './middleware/role.middleware.js';
import { ROLES } from './constants/roles.js';
import authRoutes from './routes/auth.routes.js';
import * as userController from './controllers/user.controller.js';
import { validate } from './middleware/validation.middleware.js';
import { createUserSchema, listUsersQuerySchema, userIdParamsSchema, userProfileSchema, userStatusSchema } from './validators/user.validator.js';
import datasetRoutes from './routes/dataset.routes.js';
import scheduleRoutes from './routes/schedule.routes.js';
import examRoutes from './routes/exam.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import manualScheduleRoutes from './routes/manual-schedule.routes.js';
import roomRoutes from './routes/room.routes.js';
import { facultyScheduleRoutes, studentScheduleRoutes } from './routes/personal-schedule.routes.js';
import scenarioRoutes from './routes/scenario.routes.js';
import disruptionRoutes from './routes/disruption.routes.js';
import conflictRoutes from './routes/conflict.routes.js';
import substituteRoutes from './routes/substitute.routes.js';
import scheduleDataRoutes from './routes/schedule-data.routes.js';
import scheduleVersionRoutes from './routes/schedule-version.routes.js';
import * as healthController from './controllers/health.controller.js';
import notificationRoutes from './routes/notification.routes.js';
import auditRoutes from './routes/audit.routes.js';
import { auditMutations } from './middleware/audit.middleware.js';

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin: env.frontendUrl,
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());
app.use(auditMutations);

if (env.nodeEnv !== 'test') {
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
}

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'CIT scheduling API is running',
    data: { status: 'ok' },
  });
});
app.get('/api/health/ready', healthController.ready);

app.use('/api/auth', authRoutes);
app.use('/api/admin/datasets', datasetRoutes);
app.use('/api/admin/schedule', scheduleRoutes);
app.use('/api/admin/schedule', manualScheduleRoutes);
app.use('/api/admin/schedule', scheduleDataRoutes);
app.use('/api/admin/schedule', scheduleVersionRoutes);
app.use('/api', examRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin/audit', auditRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/scenarios', scenarioRoutes);
app.use('/api/admin/disruptions', disruptionRoutes);
app.use('/api/conflicts', conflictRoutes);
app.use('/api', substituteRoutes);
app.use('/api/student', studentScheduleRoutes);
app.use('/api/faculty', facultyScheduleRoutes);
app.get('/api/admin/users', authenticate, requireRoles(ROLES.ADMIN), validate(listUsersQuerySchema, 'query'), userController.listUsers);
app.post('/api/admin/users', authenticate, requireRoles(ROLES.ADMIN), validate(createUserSchema), userController.createUser);
app.patch('/api/admin/users/:userId/status', authenticate, requireRoles(ROLES.ADMIN), validate(userIdParamsSchema, 'params'), validate(userStatusSchema), userController.setStatus);
app.patch('/api/admin/users/:userId/profile', authenticate, requireRoles(ROLES.ADMIN), validate(userIdParamsSchema, 'params'), validate(userProfileSchema), userController.updateProfile);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
