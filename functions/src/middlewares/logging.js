const { logger } = require("firebase-functions");

function logging(req, res, next) {
  const logMessage = `${req.method} ${req.url}`;

  // log en firebase logs
  logger.info(logMessage, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  // console.log para desarrollo local
  console.log(logMessage);

  next();
}
module.exports = logging;
