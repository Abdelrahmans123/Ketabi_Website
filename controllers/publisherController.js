import asyncHandler from "../utils/asyncHandler.js";
import { successResponse } from "../utils/successResponse.js";
import AppError from "../utils/AppError.js";  
import User from "../models/User.js";
import PublisherOrder from "../models/publisherOrder.js";
import { roleEnum } from "../utils/roleEnum.js";

export const createPublisher = asyncHandler(async (req, res, next) => {
    // the id of the user document to give role publisher
    const { publisherId } = req.body;

    const userDoc = await User.findById(publisherId);

    if (!userDoc) return next(new AppError("Id not found", 400));
    userDoc.role = roleEnum.publisher;
    await userDoc.save()    
    return successResponse({
        res,
        statusCode: 201,
        message: "Publisher created successfully",
        data: userDoc,
    });
});

export const getPublishedBooks = asyncHandler(async (req, res, next) => {
    const { publisherId } = req.params;
    const publisher = await User.findById(publisherId);

    if (!publisher) throw new AppError("Publisher not found", 404);

    return successResponse({
        res,
        statusCode: 200,
        message: "Published books retrieved successfully",
        data: publisher.booksPublished || [],
    });
});

export const getPublisherOrders = asyncHandler(async (req, res, next) => {
    const { publisherId } = req.params;
    const publisherOrders = await PublisherOrder.find({publisher: publisherId});

    if (!publisherOrders.length) throw new AppError("No orders for this publisher", 404);

    return successResponse({
        res,
        statusCode: 200,
        message: "Orders for publisher retrieved successfully",
        data: publisherOrders,
    });
});
