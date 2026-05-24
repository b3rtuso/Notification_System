import crypto from 'crypto';

/**
 * Generates a SHA-256 hash that uniquely identifies a notification
 * by its content. Used to detect and block duplicate sends.
 *
 * @param recipientEmail - Target email address
 * @param subject        - Notification subject
 * @param body           - Notification body/message
 * @returns hex-encoded SHA-256 hash string
 */
export function generateContentHash(
  recipientEmail: string,
  subject: string,
  body: string
): string {
  const raw = [
    recipientEmail.toLowerCase().trim(),
    subject.trim(),
    body.trim(),
  ].join('|:::|');

  return crypto.createHash('sha256').update(raw).digest('hex');
}
