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
			new Error("Session expired, please login again", { cause: 401 })
		);
	}
	const user = await User.findById(decoded.id);
	if (user.changeCredintialTime?.getTime() > decoded.iat * 1000) {
		return next(
			new Error("Session expired, please login again", { cause: 401 })
		);
	}
	req.user = decoded;
	next();
});
