import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  handleSendNotification,
  handleListNotifications,
  handleGetNotification,
  handleGetNotificationLogs,
  handleHealthCheck,
  sendNotificationValidation,
  listNotificationsValidation,
} from '../controllers/notificationController';

const router = Router();

// ─────────────────────────────────────────────────────────────────
//  Public Routes (no auth required)
// ─────────────────────────────────────────────────────────────────

/**
 * GET /api/health
 * Health check for load balancers and integration partners.
 */
router.get('/health', handleHealthCheck);

// ─────────────────────────────────────────────────────────────────
//  Protected Routes (require valid token from Auth System)
// ─────────────────────────────────────────────────────────────────

/**
 * POST /api/notifications
 * Body: { recipientEmail, recipientName?, subject, body, channel?, sourceSystem }
 *
 * Accepts a notification request from an authorized external system.
 * - Validates the token against the Auth & Authorization System
 * - Checks for duplicate notifications within the configured time window
 * - Sends the email and persists the log
 * - Syncs the result to the Legacy System
 */
router.post('/notifications', authenticate, sendNotificationValidation, handleSendNotification);

/**
 * GET /api/notifications
 * Query params: page, limit, status, recipientEmail
 *
 * Lists notifications with pagination and optional filters.
 */
router.get('/notifications', authenticate, listNotificationsValidation, handleListNotifications);

/**
 * GET /api/notifications/:id
 * Returns a single notification with its full audit log.
 */
router.get('/notifications/:id', authenticate, handleGetNotification);

/**
 * GET /api/notifications/:id/logs
 * Returns only the audit log entries for a notification.
 */
router.get('/notifications/:id/logs', authenticate, handleGetNotificationLogs);

export default router;
