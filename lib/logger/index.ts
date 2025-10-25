import { createLogger, format, transports } from 'winston';
import path from 'path';

const logFilePath = path.join(process.cwd(), 'app.log');

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message, stack }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${stack || message}`;
    })
  ),
  transports: [
    new transports.File({ filename: logFilePath }),
  ],
});

export default logger;