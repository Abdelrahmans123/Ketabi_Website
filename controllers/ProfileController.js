import { updateOne, findById } from "../models/services/db.js";
import User from "../models/User.js";
import Book from "../models/Book.js";
import AppError from "../utils/AppError.js";
import { encrypt } from "../utils/security.js";
import { successResponse } from "../utils/successResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sendNotification } from "../utils/sendNotification.js";
import { notificationType } from "../utils/notificationTypeEnum.js";

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
    await sendNotification({
        userId: req.user._id,
        type: notificationType.PROFILE_UPDATE,
        title: "Profile Updated Successfully",
        content: "Your profile information has been updated successfully.",
        data: {
            updatedFields: Object.keys(updates),
            updatedAt: new Date(),
        },
    });

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
});

// Wishlist Management
export const addToWishlist = asyncHandler(async (req, res, next) => {
    const { bookId } = req.body;
    const userId = req.user._id;

    // Check if book exists
    const book = await Book.findById(bookId);
    if (!book) {
        throw new AppError("Book not found", 404);
    }

    // Add to wishlist
    const user = await User.findByIdAndUpdate(
        userId,
        { $addToSet: { wishlist: bookId } },
        { new: true }
    ).populate({
        path: "wishlist",
        select: "name author price image status",
    });

    return successResponse({
        res,
        statusCode: 200,
        message: `"${book.name}" added to your wishlist. We'll notify you when it's available!`,
        data: user.wishlist,
    });
});

export const removeFromWishlist = asyncHandler(async (req, res, next) => {
    const { bookId } = req.params;
    const userId = req.user._id;

    const user = await User.findByIdAndUpdate(
        userId,
        { $pull: { wishlist: bookId } },
        { new: true }
    ).populate({
        path: "wishlist",
        select: "name author price image status",
    });

    if (!user) {
        throw new AppError("User not found", 404);
    }

    return successResponse({
        res,
        statusCode: 200,
        message: "Book removed from wishlist",
        data: user.wishlist,
    });
});

export const getWishlist = asyncHandler(async (req, res, next) => {
    const userId = req.user._id;

    const user = await User.findById(userId).populate({
        path: "wishlist",
        select: "name author categoryName price discount image status stock avgRating",
    });

    if (!user) {
        throw new AppError("User not found", 404);
    }

    return successResponse({
        res,
        statusCode: 200,
        message: "Wishlist retrieved successfully",
        data: user.wishlist || [],
    });
});
