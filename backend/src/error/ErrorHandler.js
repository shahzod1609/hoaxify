
const logger = require('../shared/logger')

module.exports = (err, req, res, next) => {
  const { status, message, errors } = err;
  let validationErrors;
  if (errors) {
    validationErrors = {};
    errors.forEach((error) => (validationErrors[error.param] = error.msg));
  }
  const error = {
    path: req.originalUrl,
    timestamp: new Date().getTime(),
    message: message,
    validationErrors,
  }

  logger.error(error);
  res
    .status(status||400)
    .send(error);
};
