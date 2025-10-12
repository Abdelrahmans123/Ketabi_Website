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
        const error = AppError.create("Token not found", 401);
        return next(error);
    }
    const user = await User.findById(decoded.id);
    if (user?.changeCredentialTime?.getTime() > decoded.iat * 1000) {
        const error = AppError.create("Token expired", 401);
        return next(error);
    }
    if (!user || user.status !== "active") {
        const error = AppError.create("User not found or inactive", 401);
        return next(error);
    }
    if (user.isTwoFactorEnabled && !user.isTwoFactorAuthenticated) {
        const error = AppError.create(
            "Two factor authentication required",
            401
        );
        return next(error);
    }
    if (user.isEmailConfirmed === false) {
        const error = AppError.create(
            "Please confirm your email to proceed",
            401
        );
        return next(error);
    }
    req.user = user;
    next();
});
