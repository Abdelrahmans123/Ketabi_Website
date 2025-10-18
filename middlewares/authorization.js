import AppError from "../utils/AppError.js";

export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(new AppError("Forbidden", 403));
        }
        next();
    };
};
