import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import organizationRoutes from './organization.routes.js';
import projectRoutes from './project.routes.js';
import boardRoutes from './board.routes.js';
import taskRoutes from './task.routes.js';
import commentRoutes from './comment.routes.js';
import attachmentRoutes from './attachment.routes.js';
import notificationRoutes from './notification.routes.js';
import activityRoutes from './activity.routes.js';

const router = Router();

// API version prefix
const API_VERSION = '/v1';

// Mount routes
router.use(`${API_VERSION}/auth`, authRoutes);
router.use(`${API_VERSION}/organizations`, organizationRoutes);
router.use(`${API_VERSION}/projects`, projectRoutes);
router.use(`${API_VERSION}/boards`, boardRoutes);
router.use(`${API_VERSION}/tasks`, taskRoutes);
router.use(`${API_VERSION}/comments`, commentRoutes);
router.use(`${API_VERSION}/attachments`, attachmentRoutes);
router.use(`${API_VERSION}/notifications`, notificationRoutes);
router.use(`${API_VERSION}/activities`, activityRoutes);

// Root API info
router.get('/', (_req, res) => {
  res.json({
    name: 'CollabNest API',
    version: '1.0.0',
    description: 'Real-Time Collaborative Project Management API',
    endpoints: {
      auth: `${API_VERSION}/auth`,
      organizations: `${API_VERSION}/organizations`,
      projects: `${API_VERSION}/projects`,
      boards: `${API_VERSION}/boards`,
      tasks: `${API_VERSION}/tasks`,
      comments: `${API_VERSION}/comments`,
      attachments: `${API_VERSION}/attachments`,
      notifications: `${API_VERSION}/notifications`,
      activities: `${API_VERSION}/activities`,
    },
    documentation: '/api/docs',
  });
});

export default router;
