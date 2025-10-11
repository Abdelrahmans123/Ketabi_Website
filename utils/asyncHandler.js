import AppError from "./AppError.js";

const asyncHandler = (fn) => {
    return async (req, res, next) => {
        try {
            await fn(req, res, next);
        } catch (error) {
            console.error(error);
            const appError = AppError.create(error.message, error.statusCode);
            next(appError);
        }
    };
};
export default asyncHandler;
