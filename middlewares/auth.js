import { redisClient } from "../config/db.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { verifyJWT } from "../utils/jwt.js";

export const authenticate = asyncHandler(async (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        const error = AppError.create("Unauthorized", 401);
        return next(error);
    }
    const token = authHeader.split(" ")[1];
    const decoded = verifyJWT(token);
    const tokenData = await redisClient.hGetAll(`token:${decoded.jti}`);
    if (Object.keys(tokenData).length === 0) {
        return next(
            new AppError.create("Session expired, please login again", 401)
        );
    }
    const user = await User.findById(decoded.id);
    if (user.changeCredentialTime?.getTime() > decoded.iat * 1000) {
        return next(
            new AppError.create("Session expired, please login again", 401)
        );
    }
    if (!user || user.status !== "active") {
        return next(new AppError.create("User not found or inactive", 401));
    }
    if (user.isTwoFactorEnabled && !user.isTwoFactorAuthenticated) {
        return next(
            new AppError.create("Two factor authentication required", 401)
        );
    }
    if (user.role !== tokenData.role) {
        return next(
            new AppError.create("Role changed, please login again", 401)
        );
    }
    if (user.isEmailConfirmed === false) {
        return next(
            new AppError.create("Please confirm your email to proceed", 401)
        );
    }
    req.user = user;
    next();
});
