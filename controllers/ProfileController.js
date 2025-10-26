import { updateOne, findById } from "../models/services/db.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { encrypt } from "../utils/security.js";
import { successResponse } from "../utils/successResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

export const getProfile = asyncHandler(async (req, res, next) => {
    const user = await findById(User, req.user._id);
    if (!user) return next(AppError("User not found", 404));

    return successResponse({
        res,
        statusCode: 200,
        message: "My Profile",
        data: {
            name: user.name,
            email: user.email,
            phone: "Encrypted",
            address: user.address,
            gender: user.gender,
            avatar: user.avatar,
            role: user.role,
        },
    });
});

export const updateProfile = asyncHandler(async (req, res, next) => {
    const allowedFields = ["name", "phone", "address", "gender", "avatar"];
    const updates = {};

    for (const key of allowedFields) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (updates.phone) {
        updates.phone = encrypt({
            plainText: updates.phone,
            secretKey: process.env.ENCRYPTION_KEY,
        });
    }

    if (updates.address && !Array.isArray(updates.address)) {
        updates.address = [updates.address];
    }

    const updatedUser = await updateOne(User, { _id: req.user._id }, updates);

    return successResponse({
        res,
        statusCode: 200,
        message: "ur Profile has been updated",
        data: {
            name: updatedUser.name,
            email: updatedUser.email,
            address: updatedUser.address,
            gender: updatedUser.gender,
            avatar: updatedUser.avatar,
        },
    });
});

export const getLibrary = asyncHandler(async (req, res, next) => {
    const userId = req.user.id;
    // Get user and populate their library books
    const user = await User.findById(userId)
        .populate({
            path: "library",
            model: "Book",
            select: "name author categoryName price type avgRating coverImage", // optional fields
        })
        .select("library");

    if (!user) {
        throw new AppError("User not found", 404);
    }

    return successResponse({
        res,
        statusCode: 200,
        message: "User library retrieved successfully",
        data: user.library || [],
    });
})