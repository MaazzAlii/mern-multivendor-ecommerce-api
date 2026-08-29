const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format:
    process.env.NODE_ENV === 'production'
      ? format.combine(format.timestamp(), format.json())
      : format.combine(
          format.colorize(),
          format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
            return `[${timestamp}] ${level}: ${message}${metaStr}`;
          })
        ),
  transports: [new transports.Console()],
});

module.exports = logger;
