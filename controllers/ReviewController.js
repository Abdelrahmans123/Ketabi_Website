import mongoose from "mongoose";
import Review from "../models/Review.js";
import Book from "../models/Book.js";
import { Order } from "../models/Order.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { successResponse } from "../utils/successResponse.js";
import { paymentStatus } from "../utils/orderEnums.js"; 

export const createReview = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const { book, rating, title, body } = req.body;

  const bookExists = await Book.exists({ _id: book });
  if (!bookExists) throw new AppError("Book not found", 404);

  const purchased = await Order.exists({
    user: userId,
    paymentStatus: paymentStatus.paid,
    "items.book": new mongoose.Types.ObjectId(book),
  });

  if (!purchased) {
    throw new AppError("You can review only books you purchased", 403);
  }

  try {
    const review = await Review.create({ user: userId, book, rating, title, body });
    return successResponse({
      res,
      statusCode: 201,
      message: "Review created",
      data: { review },
    });
  } catch (err) {
    if (err?.code === 11000) {
      throw new AppError("You already reviewed this book", 409);
    }
    throw err;
  }
});

export const listByBook = asyncHandler(async (req, res) => {
  const { bookId } = req.params;
  if (!mongoose.isValidObjectId(bookId)) throw new AppError("Invalid book id", 400);

  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 50);
  const sort =
    req.query.sort === "top"
      ? { rating: -1, createdAt: -1 }
      : { createdAt: -1, _id: -1 };

  const filter = { book: bookId };

  const [items, total] = await Promise.all([
    Review.find(filter)
      .populate({ path: "user", select: "name _id" })
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
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
  if (!mongoose.isValidObjectId(id)) throw new AppError("Invalid review id", 400);

  const review = await Review.findById(id).populate({ path: "user", select: "name _id" });
  if (!review) throw new AppError("Review not found", 404);

  return successResponse({ res, data: { review } });
});

export const updateReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new AppError("Invalid review id", 400);

  const current = await Review.findById(id);
  if (!current) throw new AppError("Review not found", 404);

  const isOwner = current.user.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";
  if (!isOwner && !isAdmin) throw new AppError("Forbidden", 403);

  const updates = {};
  ["rating", "title", "body"].forEach((k) => {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  });

  const updated = await Review.findOneAndUpdate({ _id: id }, updates, {
    new: true,
    runValidators: true,
  });

  return successResponse({ res, message: "Review updated", data: { review: updated } });
});

export const deleteReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new AppError("Invalid review id", 400);

  const current = await Review.findById(id);
  if (!current) throw new AppError("Review not found", 404);

  const isOwner = current.user.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";
  if (!isOwner && !isAdmin) throw new AppError("Forbidden", 403);

  await Review.findOneAndDelete({ _id: id });
  return successResponse({ res, statusCode: 204, message: "Review deleted" });
});


export const listMine = asyncHandler(async (req, res) => {
  const items = await Review.find({ user: req.user._id }).sort({ createdAt: -1 });
  return successResponse({ res, data: { items } });
});
