import {
    updateOne,
    findById,
    findByIdAndUpdate,
    findAll,
    create,
} from "../models/services/db.js";
import User from "../models/User.js";
import Book from "../models/Book.js";
import AppError from "../utils/AppError.js";
import { decrypt, encrypt } from "../utils/security.js";
import { successResponse } from "../utils/successResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sendNotification } from "../utils/sendNotification.js";
import { notificationType } from "../utils/notificationTypeEnum.js";
import Response from "../models/Response.js";

export const getProfile = asyncHandler(async (req, res, next) => {
    const user = await findById({ model: User, id: req.user._id });
    if (!user) return next(AppError("User not found", 404));
    const decryptedPhone = user.phone
        ? decrypt({
              cipherText: user.phone,
              secretKey: process.env.ENCRYPTION_KEY,
          })
        : null;
    return successResponse({
        res,
        statusCode: 200,
        message: "My Profile",
        data: {
            name: user.name,
            email: user.email,
            phone: decryptedPhone,
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
    const updatedUser = await updateOne({
        model: User,
        query: { _id: req.user._id },
        data: updates,
    });
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
    const user = await findById({
        model: User,
        id: userId,
        populate: {
            path: "library",
            model: "Book",
        },
        select: "library",
    });

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

export const getWishlist = asyncHandler(async (req, res, next) => {
    const userId = req.user.id;

    const user = await findById({
        model: User,
        id: userId,
        populate: {
            path: "wishlist.book",
            select: "name author price discount image status description edition recommendedAge bookLanguage genre stock",
        },
    });

    if (!user) throw new AppError("User not found", 404);
    // Format the wishlist properly
    const formattedWishlist = user.wishlist
        .filter((item) => item.book) // Filter out items with null books
        .map((item) => {
            // Convert Mongoose document to plain object if needed
            const bookData = item.book.toObject
                ? item.book.toObject()
                : item.book;

            return {
                book: bookData,
                addedDate: item.addedDate || new Date().toISOString(),
            };
        });
    return successResponse({
        res,
        statusCode: 200,
        message: "Wishlist retrieved successfully",
        data: formattedWishlist,
    });
});

export const addToWishlist = asyncHandler(async (req, res, next) => {
    const { bookId } = req.body;
    const userId = req.user.id;

    if (!bookId) {
        throw new AppError("Book ID is required", 400);
    }

    const book = await findById({ model: Book, id: bookId });
    if (!book) {
        throw new AppError("Book not found", 404);
    }

    const user = await findById({
        model: User,
        id: userId,
        populate: {
            path: "wishlist.book",
            select: "_id",
        },
    });
    const alreadyInWishlist = user.wishlist.some((item) => {
        if (!item || !item.book || !item.book._id) return false;
        return item.book._id.toString() === bookId.toString();
    });

    if (alreadyInWishlist) {
        throw new AppError("Book already in wishlist", 400);
    }
    const updatedUser = await findByIdAndUpdate({
        model: User,
        id: userId,
        data: {
            $push: {
                wishlist: {
                    book: bookId,
                    addedDate: new Date(),
                },
            },
        },
        populate: {
            path: "wishlist.book",
            select: "name author price discount image status description edition recommendedAge bookLanguage genre stock",
        },
    });

    if (!updatedUser) {
        throw new AppError("Failed to update wishlist", 500);
    }

    // Format response - filter out any null books and format properly
    const formattedWishlist = updatedUser.wishlist
        .filter((item) => item && item.book)
        .map((item) => {
            // Handle Mongoose document conversion
            const bookData = item.book.toObject
                ? item.book.toObject()
                : item.book;
            const dateString =
                item.addedDate instanceof Date
                    ? item.addedDate.toISOString()
                    : item.addedDate || new Date().toISOString();

            return {
                book: bookData,
                addedDate: dateString,
            };
        });

    return successResponse({
        res,
        statusCode: 200,
        message: `"${book.name}" added to your wishlist. We'll notify you when it's available!`,
        data: formattedWishlist,
    });
});

// Also update removeFromWishlist
export const removeFromWishlist = asyncHandler(async (req, res, next) => {
    const { bookId } = req.params;
    const userId = req.user.id;

    const user = await findByIdAndUpdate({
        model: User,
        id: userId,
        data: { $pull: { wishlist: { book: bookId } } },
        populate: {
            path: "wishlist.book",
            select: "name author price discount image status description edition recommendedAge bookLanguage genre stock",
        },
    });

    if (!user) {
        throw new AppError("User not found", 404);
    }

    // Format response
    const formattedWishlist = user.wishlist
        .filter((item) => item.book)
        .map((item) => ({
            book: item.book.toObject ? item.book.toObject() : item.book,
            addedDate: item.addedDate || new Date().toISOString(),
        }));

    return successResponse({
        res,
        statusCode: 200,
        message: "Book removed from wishlist",
        data: formattedWishlist,
    });
});
export const sendResponse = asyncHandler(async (req, res, next) => {
    const { message } = req.body;
    const userId = req.user._id;
    if (!message) {
        return next(AppError("Message is required", 400));
    }
    const newResponse = await create({
        model: Response,
        data: {
            userId,
            message,
        },
    });
    return successResponse({
        res,
        statusCode: 201,
        message: "Response sent successfully",
        data: newResponse,
    });
});
export const getResponses = asyncHandler(async (req, res, next) => {
    const userId = req.user._id;
    const responses = await findAll({
        model: Response,
        filter: { userId },
        sort: { createdAt: -1 },
    });
    if (!responses || responses.length === 0) {
        return next(new AppError("No responses found for this user", 404));
    }
    return successResponse({
        res,
        statusCode: 200,
        message: "User responses retrieved successfully",
        data: responses,
    });
});
