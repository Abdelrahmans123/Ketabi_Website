import Publisher from "../models/Publisher.js";
import { Order } from "../models/Order.js";
import asyncHandler from "../utils/asyncHandler.js";
import { successResponse } from "../utils/successResponse.js";
import AppError from "../utils/AppError.js";  

export const createPublisher = asyncHandler(async (req, res, next) => {
    const { name, email, contactNumber, address } = req.body;

    if (!name || !email) {
        throw new AppError("Name and Email are required", 400);
    }

    const existing = await Publisher.findOne({ email });
    if (existing) {
        throw new AppError("Publisher with this email already exists", 400);
    }

    const publisher = await Publisher.create({ name, email, contactNumber, address });

    return successResponse({
        res,
        statusCode: 201,
        message: "Publisher created successfully",
        data: publisher,
    });
});

export const getPublishedBooks = asyncHandler(async (req, res, next) => {
    const { publisherId } = req.params;
    const publisher = await Publisher.findById(publisherId)
        .populate("booksPublished", "name author price stock");

    if (!publisher) throw new AppError("Publisher not found", 404);

    return successResponse({
        res,
        statusCode: 200,
        message: "Published books retrieved successfully",
        data: publisher.booksPublished,
    });
});

export const getPublisherOrders = asyncHandler(async (req, res, next) => {
    const { publisherId } = req.params;
    const orders = await Order.find({ "items.publisher": publisherId })
        .populate("user", "name email")
        .populate("items.book", "name");

    if (!orders.length) throw new AppError("No orders for this publisher", 404);

    return successResponse({
        res,
        statusCode: 200,
        message: "Orders for publisher retrieved successfully",
        data: orders,
    });
});
