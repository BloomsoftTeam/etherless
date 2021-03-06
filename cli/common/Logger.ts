import winston = require('winston');

const aFormat = winston.format.printf(({
  level, message, timestamp,
}) => `${timestamp}\t${level}: ${message}`);

const logger = winston.createLogger({
  level: 'info',
  // format: winston.format.simple(),
  format: winston.format.combine(
    winston.format.timestamp(),
    aFormat,
  ),
  // defaultMeta: { service: 'user-service' },
  transports: [
    //
    // - Write all logs with level `error` and below to `error.log`
    // - Write all logs with level `info` and below to `combined.log`
    //
    // new winston.transports.File({ filename: 'error.log', level: 'error' }),
    // new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console(),
  ],
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
/*
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}


*/
export { logger as default };
