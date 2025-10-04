import { STATUS_CODE, STATUS_TEXT } from "../utils/jsend.js";
import logger from "../utils/logger.js";

function errorHandler(err, req, res, next) {
  logger.error({
    message: err.message,
    stack: err.stack,
    route: req.originalUrl,
    method: req.method,
  });

  res.status(STATUS_CODE.INTERNAL_ERROR).json({
    status: STATUS_TEXT.ERROR,
    message: err.message,
  });
}

export default errorHandler;
