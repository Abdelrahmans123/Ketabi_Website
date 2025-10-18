import AppError from "../utils/AppError.js";

export const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body, { abortEarly: false });

        if (error) {
            const extractedErrors = error.details.map((err) => ({
                [err.path.join(".")]: err.message,
            }));

            const appError = new AppError(
                "Validation Error",
                400,
                extractedErrors
            );
            return next(appError);
        }
        next();
    };
};
