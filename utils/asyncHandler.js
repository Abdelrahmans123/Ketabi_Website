import AppError from "./AppError.js";

const asyncHandler = (fn) => {
	return async (req, res, next) => {
		try {
			await fn(req, res, next);
		} catch (error) {
			const appError = AppError.create(error.message, error.statusCode || 500);
			next(appError);
		}
	};
};
export default asyncHandler;
