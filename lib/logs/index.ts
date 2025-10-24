// logger.ts
import pino from 'pino';
import fs from 'fs';
import path from 'path';

const logPath = path.join(process.cwd(), 'server.log');

const streams = [
  { stream: fs.createWriteStream(logPath, { flags: 'a' }) },
  { stream: process.stdout },
];

const logger = pino({}, pino.multistream(streams));

export default logger;