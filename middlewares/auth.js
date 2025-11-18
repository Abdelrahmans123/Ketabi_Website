import { redisClient } from "../config/db.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { verifyAccessToken } from "../utils/jwt.js";

export const authenticate = asyncHandler(async (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        const error = new AppError("Unauthorized", 401);
        return next(error);
    }
    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);
    const tokenData = await redisClient.hGetAll(`token:${decoded.jti}`);
    const user = await User.findById(decoded.id);
    if (!user) {
        return next(new AppError("User not found", 401));
    }
    if (user.status !== "active") {
        return next(new AppError("User is inactive", 401));
    }
    const activeJti = await redisClient.get(`user:${decoded.id}:activeToken`);
    if (activeJti !== decoded.jti) {
        return next(new AppError("Logged in from another device", 401));
    }
    if (Object.keys(tokenData).length === 0) {
        const error = new AppError("Token not found", 401);
        return next(error);
    }
    if (user?.changeCredentialTime?.getTime() > decoded.iat * 1000) {
        const error = new AppError("Token expired", 401);
        return next(error);
    }
    if (!user || user.status !== "active") {
        const error = new AppError("User not found or inactive", 401);
        return next(error);
    }
    if (user.isTwoFactorEnabled && tokenData.twoFactorVerified !== "true") {
        return next(new AppError("Two factor authentication required", 401));
    }
    if (user.isEmailConfirmed === false) {
        const error = new AppError("Please confirm your email to proceed", 401);
        return next(error);
    }
    req.user = user;
    next();
});
