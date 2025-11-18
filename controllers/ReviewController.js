import mongoose from "mongoose";
import Review from "../models/Review.js";
import Book from "../models/Book.js";
import { Order } from "../models/Order.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { successResponse } from "../utils/successResponse.js";
import { paymentStatus } from "../utils/orderEnums.js";
import {
    findAll,
    findById,
    findOneAndUpdate,
    remove,
} from "../models/services/db.js";
import { invalidateCache } from "../middlewares/cach.js";

const invalidateBookCache = async (bookId) => {
    if (!bookId) return;
    await invalidateCache([`Get-Book:id=${bookId}`]);
};

export const createReview = asyncHandler(async (req, res, next) => {
    const userId = req.user._id;

    const { book, rating, title, body } = req.body;

    const purchasedBooks = req.user.purchasedBooks.toString();
    
    if (!purchasedBooks.includes(book)){
        throw new AppError("You can review only books you purchased", 403);
    }

    const bookExists = await Book.exists({ _id: book });
    if (!bookExists) throw new AppError("Book not found", 404);

    const alreadyReviewed = await Review.exists({ user: userId, book });
    if (alreadyReviewed) {
        throw new AppError("You already reviewed this book. You can edit your review instead.", 409);
    }

    const review = await Review.create({
        user: userId,
        book,
        rating,
        title,
        body,
    });
    await invalidateBookCache(book);
    return successResponse({
        res,
        statusCode: 201,
        message: "Review created",
        data: { review },
    });
});

export const listByBook = asyncHandler(async (req, res) => {
    const { bookId } = req.params;
    if (!mongoose.isValidObjectId(bookId))
        throw new AppError("Invalid book id", 400);

    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(
        Math.max(parseInt(req.query.limit || "10", 10), 1),
        50
    );
    const sort =
        req.query.sort === "top"
            ? { rating: -1, createdAt: -1 }
            : { createdAt: -1, _id: -1 };

    const filter = { book: bookId };

    const [items, total] = await Promise.all([
        findAll({
            model: Review,
            filter,
            sort,
            skip: (page - 1) * limit,
            limit,
            populate: { path: "user", select: "name _id" },
        }),
        Review.countDocuments(filter),
    ]);

    return successResponse({
        res,
        data: {
            items,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        },
    });
});

export const getOne = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id))
        throw new AppError("Invalid review id", 400);

    const review = await findById({
        model: Review,
        id,
        populate: {
            path: "user",
            select: "name _id",
        },
    });
    if (!review) throw new AppError("Review not found", 404);

    return successResponse({ res, data: { review } });
});

export const updateReview = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id))
        throw new AppError("Invalid review id", 400);

    const current = await findById({ model: Review, id });
    if (!current) throw new AppError("Review not found", 404);

    const isOwner = current.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) throw new AppError("Forbidden", 403);

    const updates = {};
    ["rating", "title", "body"].forEach((k) => {
        if (req.body[k] !== undefined) updates[k] = req.body[k];
    });

    const updated = await findOneAndUpdate({
        model: Review,
        query: { _id: id },
        data: updates,
    });
    await invalidateBookCache(current.book);

    return successResponse({
        res,
        message: "Review updated",
        data: { review: updated },
    });
});

export const deleteReview = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id))
        throw new AppError("Invalid review id", 400);

    const current = await Review.findById(id);
    if (!current) throw new AppError("Review not found", 404);

    const isOwner = current.user.toString() === req.user._id.toString();
    if (!isOwner) throw new AppError("Forbidden", 403);

    await remove({ model: Review, query: { _id: id } });
    await invalidateBookCache(current.book);
    return successResponse({ res, statusCode: 204, message: "Review deleted" });
});

export const listMine = asyncHandler(async (req, res) => {
    const items = await findAll({
        model: Review,
        filter: {
            user: req.user._id,
        },
        sort: { createdAt: -1 },
    });
    return successResponse({ res, data: { items } });
});
