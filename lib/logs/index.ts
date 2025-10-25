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
    new transports.Console({
      format: format.combine(
        format.colorize({ all: true }),
        format.printf(({ timestamp, level, message, stack }) => {
          return `[${timestamp}] ${level}: ${stack || message}`;
        })
      )
    }),
    new transports.File({ filename: logFilePath }),
    // new transports.Http({
    //   host: 'localhost', // Replace with your log server
    //   port: 3010,
    //   path: '/log',
    //   ssl: false
    // })
  ],
});

export default logger;