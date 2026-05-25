import { Request, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import { NotificationChannel, NotificationStatus } from '../services/notificationService';
import {
  sendNotification,
  getNotificationById,
  listNotifications,
  getNotificationLogs,
} from '../services/notificationService';
import { createError } from '../middleware/errorHandler';
import logger from '../utils/logger';

// ─────────────────────────────────────────────────────────────────
//  Validation Schemas
// ─────────────────────────────────────────────────────────────────

export const sendNotificationValidation = [
  body('recipientEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('recipientEmail must be a valid email address.'),
  body('recipientName')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('recipientName must be a string up to 100 characters.'),
  body('subject')
    .notEmpty()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('subject is required and must not exceed 255 characters.'),
  body('body')
    .notEmpty()
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('body is required and must not exceed 10,000 characters.'),
  body('channel')
    .optional()
    .isIn(['EMAIL', 'SMS', 'PUSH'])
    .withMessage('channel must be one of: EMAIL, SMS, PUSH'),
  body('sourceSystem')
    .notEmpty()
    .trim()
    .withMessage('sourceSystem is required. Identify which system is sending this request.'),
];

export const listNotificationsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer.'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100.'),
  query('status')
    .optional()
    .isIn(['PENDING', 'SENT', 'FAILED', 'DUPLICATE'])
    .withMessage('status must be one of: PENDING, SENT, FAILED, DUPLICATE'),
  query('recipientEmail')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('recipientEmail must be a valid email.'),
];

// ─────────────────────────────────────────────────────────────────
//  Helper
// ─────────────────────────────────────────────────────────────────

function handleValidation(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({
      success: false,
      error: 'Validation failed.',
      details: errors.array(),
    });
    return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────
//  Controllers
// ─────────────────────────────────────────────────────────────────

/**
 * POST /api/notifications
 * Accepts a notification request from another system.
 * Requires authentication.
 */
export async function handleSendNotification(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!handleValidation(req, res)) return;

  try {
    const { recipientEmail, recipientName, subject, body, channel, sourceSystem } = req.body;

    const result = await sendNotification({
      recipientEmail,
      recipientName,
      subject,
      body,
      channel,
      requestedBy: String(req.user!.id),
      sourceSystem: sourceSystem || req.user!.email || 'unknown',
    });

    if (result.duplicate) {
      res.status(409).json({
        success: false,
        duplicate: true,
        notificationId: result.notificationId,
        message: result.message,
      });
      return;
    }

    const statusCode = result.success ? 201 : 202; // 201=sent, 202=accepted but failed delivery
    res.status(statusCode).json({
      success: result.success,
      duplicate: false,
      notificationId: result.notificationId,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/notifications
 * Lists all notifications with pagination and optional filters.
 * Requires authentication.
 */
export async function handleListNotifications(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!handleValidation(req, res)) return;

  try {
    const page  = Number(req.query.page  || 1);
    const limit = Number(req.query.limit || 20);
    const status = req.query.status as NotificationStatus | undefined;
    const recipientEmail = req.query.recipientEmail as string | undefined;

    const result = await listNotifications({ page, limit, status, recipientEmail });

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/notifications/:id
 * Returns a single notification with its full audit log.
 * Requires authentication.
 */
export async function handleGetNotification(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const notification = await getNotificationById(id);

    if (!notification) {
      next(createError(`Notification with ID '${id}' not found.`, 404));
      return;
    }

    res.json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/notifications/:id/logs
 * Returns the full audit log for a specific notification.
 * Requires authentication.
 */
export async function handleGetNotificationLogs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    // Verify notification exists
    const notification = await getNotificationById(id);
    if (!notification) {
      next(createError(`Notification with ID '${id}' not found.`, 404));
      return;
    }

    const logs = await getNotificationLogs(id);
    res.json({ success: true, notificationId: id, total: logs.length, logs });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/health
 * Health check — public endpoint, no auth required.
 * Useful for load balancers and integration partners.
 */
export async function handleHealthCheck(req: Request, res: Response): Promise<void> {
  res.json({
    success: true,
    service: 'Notification System',
    status: 'operational',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
}
