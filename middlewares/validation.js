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

export const queryValidate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.query, { abortEarly:false});

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

export const paramValidate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.params, { abortEarly:false});

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