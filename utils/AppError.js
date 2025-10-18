class AppError extends Error {
    constructor(message, statusCode, details = null) {
        super(typeof message === "string" ? message : "Validation Error");
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
        if (details) this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}

export default AppError;
