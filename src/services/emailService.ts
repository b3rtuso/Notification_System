import { getTransporter } from '../config/email';
import logger from '../utils/logger';

export interface SendEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  body: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Sends a plain-text + HTML email notification.
 * Returns a result object instead of throwing so the caller
 * can decide how to handle failures.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, toName, subject, body } = options;
  const from = process.env.EMAIL_FROM || 'Notification System <noreply@system.local>';
  const toAddress = toName ? `${toName} <${to}>` : to;

  try {
    const transporter = getTransporter();

    const info = await transporter.sendMail({
      from,
      to: toAddress,
      subject,
      text: body,
      html: buildHtmlBody(body, subject),
    });

    logger.info('Email sent successfully', {
      to,
      subject,
      messageId: info.messageId,
    });

    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    logger.error('Email send failed', {
      to,
      subject,
      error: err.message,
    });

    return { success: false, error: err.message };
  }
}

/**
 * Wraps plain-text body in a minimal branded HTML template.
 */
function buildHtmlBody(body: string, subject: string): string {
  const escaped = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>${subject}</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: #fff;
                     border-radius: 8px; overflow: hidden;
                     box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: #1e3a5f; color: #fff; padding: 24px 32px; }
        .header h1 { margin: 0; font-size: 20px; }
        .body { padding: 32px; color: #333; line-height: 1.6; }
        .footer { background: #f0f0f0; padding: 16px 32px;
                  font-size: 12px; color: #888; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>🔔 ${subject}</h1></div>
        <div class="body"><p>${escaped}</p></div>
        <div class="footer">
          This is an automated message from the Notification System.
          Please do not reply to this email.
        </div>
      </div>
    </body>
    </html>
  `.trim();
}