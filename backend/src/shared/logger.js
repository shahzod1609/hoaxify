const { createLogger, transports, format } = require('winston');

const customFormat = format.combine(
  format.errors({ stack: true }),
  format.timestamp({ format: 'MMM-DD-YYYY HH:mm:ss' }),
  format.align(),
  format.printf(({ level, message, timestamp, stack }) => {
    return `[${timestamp}]  [${level.padEnd(5).toUpperCase()}]:${message}`;
  })
);

const destinations = [new transports.Console()];
if (process.env.NODE_ENV === 'development') {
  destinations.push(new transports.File({ filename: 'app.log' }));
}

const logger = createLogger({
  transports: destinations,
  level: 'debug',
  format: customFormat,
});

module.exports = logger;
