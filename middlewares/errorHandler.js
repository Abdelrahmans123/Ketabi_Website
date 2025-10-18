import HTTPStatusText from "../utils/HTTPStatusText.js";
import logger from "../utils/logger.js";
const errorHandler = (err, req, res, next) => {
    logger.error({
        message: err.message,
        stack: err.stack,
        route: req.originalUrl,
        method: req.method,
    });
    res.status(err.statusCode || 500).json({
        status: err.status || HTTPStatusText.FAILURE,
        message: err.message || "Internal Server Error",
        code: err.statusCode || 500,
        details: err.details || null,
        stack: err.stack,
        data: null,
    });
};

export default errorHandler;
