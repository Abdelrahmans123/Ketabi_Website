import asyncHandler from "../utils/asyncHandler.js";
import { successResponse } from "../utils/successResponse.js";
import AppError from "../utils/AppError.js";
import User from "../models/User.js";
import PublisherOrder from "../models/publisherOrder.js";
import { roleEnum } from "../utils/roleEnum.js";
import Book from "../models/Book.js";
import { Order } from "../models/Order.js";
import { sendEmail } from "../utils/sendEmail.js";
import { findAll, findById } from "../models/services/db.js";

export const createPublisher = asyncHandler(async (req, res, next) => {
    const { publisherId } = req.body;

    const userDoc = await findById({ model: User, id: publisherId });

    if (!userDoc) return next(new AppError("Id not found", 400));
    userDoc.role = roleEnum.publisher;
    await userDoc.save();
    return successResponse({
        res,
        statusCode: 201,
        message: "Publisher created successfully",
        data: userDoc,
    });
});

export const getPublishedBooks = asyncHandler(async (req, res, next) => {
    const { publisherId } = req.params;

    const publisher = await findById({
        model: User,
        id: publisherId,
        populate: {
            path: "booksPublished",
            model: "Book",
        },
    });

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
    const user = req.user;

    if (user.role === roleEnum.publisher && user.id !== publisherId) {
        return next(new AppError("You can only view your own orders", 403));
    }

    const publisherOrders = await findAll({
        model: PublisherOrder,
        query: { publisher: publisherId },
    });

    if (!publisherOrders.length)
        throw new AppError("No orders for this publisher", 404);

    return successResponse({
        res,
        statusCode: 200,
        message: "Orders for publisher retrieved successfully",
        data: publisherOrders,
    });
});

export const updatePublisherOrder = asyncHandler(async (req, res, next) => {
    const { publisherOrderId } = req.params;
    const { deliveryStatus, paymentStatus, BookId } = req.body;

    if (!deliveryStatus && !paymentStatus)
        throw new AppError("Nothing changed", 404);

    const book = await Book.findById(BookId);
    if (!book) throw new AppError("Book not found", 404);

    const publisherOrder = await findById({
        model: PublisherOrder,
        id: publisherOrderId,
    });
    const publisherId = publisherOrder.publisher;
    if (!publisherOrder) throw new AppError("Publisher order not found", 404);

    // logged-in publisher owns this order
    if (
        publisherOrder.publisher.toString() !== publisherId &&
        req.user.role !== roleEnum.admin
    ) {
        return next(
            new AppError("You are not authorized to update this order", 403)
        );
    }

    // Update PublisherOrder fields
    publisherOrder.items = publisherOrder.items.map((item) => {
        if (item.book.toString() === BookId) {
            return {
                ...item.toObject(),
                deliveryStatus: deliveryStatus || item.deliveryStatus,
                paymentStatus: paymentStatus || item.paymentStatus,
            };
        }
        return item;
    });

    await publisherOrder.save();


    const mainOrder = await findById({
        model: Order,
        id: publisherOrder.order,
    });
    if (mainOrder) {
        mainOrder.items = mainOrder.items.map((item) => {
            console.log(
                "item.publisher.toString(): ",
                item.publisher.toString()
            );
            console.log("publisherId: ", publisherId);
            console.log("item.book.toString(): ", item.book.toString());
            console.log("BookId: ", BookId);

            if (
                item.publisher.toString() === publisherId.toString() &&
                item.book.toString() === BookId
            ) {
                return {
                    ...item.toObject(),
                    deliveryStatus: deliveryStatus || item.deliveryStatus,
                    paymentStatus: paymentStatus || item.paymentStatus,
                };
            }
            return item;
        });

        await mainOrder.save();
    }

    // an email message
    const bookItem = publisherOrder.items.find(
        (i) => i.book.toString() === BookId
    );

    let textUpdate = "";
    if (paymentStatus && deliveryStatus)
        textUpdate = `Your book: ${book.name} from order ${mainOrder.orderNumber}: Delivery Status: ${deliveryStatus} and Payment Status as ${paymentStatus}.`;
    else if (deliveryStatus)
        textUpdate = `Your book: ${book.name} from order ${mainOrder.orderNumber}: Delivery Status: ${deliveryStatus}.`;
    else if (paymentStatus)
        textUpdate = `Your book: ${book.name} from order ${mainOrder.orderNumber}: Payment Status as ${paymentStatus}.`;

    await sendEmail({
        to: mainOrder.userEmail,
        subject: "Order Update",
        text: textUpdate,
    });

    return successResponse({
        res,
        statusCode: 200,
        message: "Publisher order and main order updated successfully",
        data: {
            publisherOrder,
            mainOrder,
        },
    });
});
