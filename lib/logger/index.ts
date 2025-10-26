import { createLogger, format, transports } from 'winston';
import path from 'path';
import stripAnsi from 'strip-ansi';

const logFilePath = path.join(process.cwd(), 'app.log');

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message, stack }) => {
      const raw = typeof stack === 'string' ? stack : (typeof message === 'string' ? message : String(stack ?? message ?? ''));
      return `[${timestamp}] ${level.toUpperCase()}: ${stripAnsi(raw)}`;
    })
  ),
  transports: [
    new transports.File({ filename: logFilePath }),
  ],
});

const originalWrite = process.stdout.write;

process.stdout.write = (function (chunk: string | Uint8Array, encodingOrCb?: BufferEncoding | ((err?: Error | null) => void), cb?: (err?: Error | null) => void): boolean {
  // Determine whether the second argument is an encoding or a callback
  let encoding: BufferEncoding | undefined;
  let callback: ((err?: Error | null) => void) | undefined;

  if (typeof encodingOrCb === 'function') {
    callback = encodingOrCb;
  } else {
    encoding = encodingOrCb;
    callback = cb;
  }

  // Capture the log line
  const line = typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString(encoding || 'utf8');
  // Send to Winston or elsewhere
  logger.info(line.trim());
  // Still write to console
  return originalWrite.call(process.stdout, chunk as any, encoding as any, callback);
}) as typeof process.stdout.write;

 
export default logger;