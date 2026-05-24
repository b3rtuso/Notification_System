import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import notificationRoutes from './routes/notificationRoutes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { verifySmtpConnection } from './config/email';
import { verifyDatabaseConnection } from './config/database';
import { warmUserCache } from './middleware/auth';
import logger from './utils/logger';

const app  = express();
const PORT = Number(process.env.PORT || 3000);

app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please try again after 15 minutes.' },
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api', notificationRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

async function bootstrap() {
  try {
    await verifyDatabaseConnection();
    await verifySmtpConnection();
    await warmUserCache();

    app.listen(PORT, () => {
      logger.info(`Notification System running on port ${PORT}`);
    });
  } catch (err: any) {
    logger.error('Failed to start', { error: err.message });
    process.exit(1);
  }
}

bootstrap();
export default app;
