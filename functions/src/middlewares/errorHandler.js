const { logger } = require("firebase-functions");
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = err.status || 500;
  let message = err.message || "Internal Server Error";
  let isDevelopment = process.env.NODE_ENV === "development";

  // loggear error en firebase
  logger.error(`${req.method} ${req.url} - ${statusCode}`, {
    error: message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    statusCode: statusCode,
    timestamp: new Date().toISOString(),
  });

  // console.error para desarrollo local
  console.error(`[ERROR ${statusCode}]`, message);
  console.error(err.stack);

  return res
    .status(statusCode)
    .json({ error: message, ...(isDevelopment && { stack: err.stack }) });
}

module.exports = errorHandler;
