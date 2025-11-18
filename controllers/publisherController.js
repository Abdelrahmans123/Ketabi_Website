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
import mongoose from "mongoose";
import { notifyOrderCancelled, notifyGiftReceived, notifyOrderConfirmed, notifyOrderDelivered, notifyOrderProcessing, notifyOrderShipped, notifyPaymentFailed, notifyPaymentRefunded, notifyPaymentSuccess } from "../services/OrderNotification.js";

export const createPublisher = asyncHandler(async (req, res, next) => {
    const { publisherId } = req.body;

    const userDoc = await findById({ model: User, id: publisherId });

    if (!userDoc) return next(new AppError("Id not found", 400));
    userDoc.role = roleEnum.publisher;
    // await userDoc.save();
    await userDoc.save({ validateBeforeSave: false });

    return successResponse({
        res,
        statusCode: 201,
        message: "Publisher created successfully",
        data: userDoc,
    });
});

export const getPublishedBooks = asyncHandler(async (req, res, next) => {
    const { publisherId } = req.params;
    let { page, limit } = req.query;

    page = Number(page) || 1;
    limit = Number(limit) || 10;
    page = Math.max(page, 1);
    limit = Math.max(limit, 1);

    const publisher = await findById({
        model: User,
        id: publisherId,
    });

    if (!publisher) throw new AppError("Publisher not found", 404);

    // First, get the actual count of existing books
    const existingBooksCount = await Book.countDocuments({
        _id: { $in: publisher.booksPublished }
    });

    const totalBooks = existingBooksCount;
    const totalPages = totalBooks === 0 ? 0 : Math.ceil(totalBooks / limit);

    if (totalPages > 0) {
        page = Math.min(page, totalPages);
    } else {
        page = 1;
    }

    const skip = Math.max(0, (page - 1) * limit);

    const publishedBooks = await findAll({
        model: Book,
        filter: { _id: { $in: publisher.booksPublished } },
        skip,
        limit,
        populate: "genre"
    });

    return successResponse({
        res,
        statusCode: 200,
        message: "Published books retrieved successfully",
        data: {
            page,
            limit,
            totalPages,
            totalBooks,
            count: publishedBooks.length,
            books: publishedBooks
        },
    });
});

export const getPublisherOrders = asyncHandler(async (req, res, next) => {
    const { publisherId } = req.params;
    let { page, limit } = req.query;
    const user = req.user;

    page = Number(page) || 1;
    limit = Number(limit) || 10;
    page = Math.max(page, 1);
    limit = Math.max(limit, 1);

    if (user.role === roleEnum.publisher && user.id !== publisherId) {
        return next(new AppError("You can only view your own orders", 403));
    }

    const total = await PublisherOrder.countDocuments({ publisher: publisherId });
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    if (totalPages > 0) {
        page = Math.min(page, totalPages);
    } else {
        page = 1;
    }

    const skip = Math.max(0, (page - 1) * limit);

    const publisherOrders = await PublisherOrder.find({ publisher: publisherId })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate({
            path: "items.book",
            select: "name Edition"   // return only the book name
        });

    return successResponse({
        res,
        statusCode: 200,
        message: "Orders for publisher retrieved successfully",
        data: {
            page,
            limit,
            total,
            totalPages,
            count: publisherOrders.length,
            orders: publisherOrders
        }
    });
});

export const updatePublisherOrder = asyncHandler(async (req, res, next) => {
    const { publisherOrderId } = req.params;
    const { deliveryStatus, paymentStatus, bookId } = req.body;

    if (!deliveryStatus && !paymentStatus)
        throw new AppError("Nothing changed", 404);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const publisherOrder = await PublisherOrder.findById(publisherOrderId).session(session);
        if (!publisherOrder) throw new AppError("Publisher order not found", 404);

        const publisherId = publisherOrder.publisher.toString();

        if (
            req.user.role === roleEnum.publisher &&
            req.user.id !== publisherId
        ) {
            throw new AppError("You are not authorized to update this order", 403);
        }

        let hasUpdated = false;

        publisherOrder.items = publisherOrder.items.map((item) => {
            if (item.book.toString() === bookId && (deliveryStatus !== item.deliveryStatus || paymentStatus !== item.paymentStatus)) {
                hasUpdated = true;
                return {
                    ...item.toObject(),
                    deliveryStatus: deliveryStatus || item.deliveryStatus,
                    paymentStatus: paymentStatus || item.paymentStatus,
                };
            }
            return item;
        });

        if (!hasUpdated) {
            await session.abortTransaction();
            try {
                return next(new AppError("Nothing was udpated in the order", 404));
            } finally {
                session.endSession();
            }
        }

        await publisherOrder.save({ session });

        const mainOrder = await Order.findById(publisherOrder.order).session(session);

        if (!mainOrder)
            throw new AppError("Main order not found", 404);

        mainOrder.items = mainOrder.items.map((item) => {
            if (
                item.publisher.toString() === publisherId &&
                item.book.toString() === bookId
            ) {
                return {
                    ...item.toObject(),
                    deliveryStatus: deliveryStatus || item.deliveryStatus,
                    paymentStatus: paymentStatus || item.paymentStatus,
                };
            }
            return item;
        });
        await mainOrder.save({ session });

        const book = await Book.findById(bookId).session(session);

        handleNotificationUpdates(mainOrder, paymentStatus, deliveryStatus)

        let textUpdate = "";
        let htmlUpdate = "";

        if (paymentStatus && deliveryStatus) {
            textUpdate = `Your book "${book.name}" from order #${mainOrder.orderNumber} has been updated.
  Delivery Status: ${deliveryStatus}
  Payment Status: ${paymentStatus}`;

            htmlUpdate = `
  <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
    <div style="max-width: 600px; margin: auto; background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
      <h2 style="color: #2c3e50;">📦 Order Update</h2>
      <p style="font-size: 16px; color: #333;">
        Hello,<br><br>
        Your book <strong>${book.name}</strong> from order <strong>#${mainOrder.orderNumber}</strong> has been updated.
      </p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">Delivery Status</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${deliveryStatus}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">Payment Status</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${paymentStatus}</td>
        </tr>
      </table>
      <p style="margin-top: 20px; color: #555;">
        Thank you for shopping with us!<br>
        <strong>Ketabi Team</strong>
      </p>
    </div>
  </div>`;
        }
        else if (deliveryStatus) {
            textUpdate = `Your book "${book.name}" from order #${mainOrder.orderNumber} has an updated Delivery Status: ${deliveryStatus}`;

            htmlUpdate = `
  <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
    <div style="max-width: 600px; margin: auto; background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
      <h2 style="color: #2c3e50;">🚚 Delivery Update</h2>
      <p style="font-size: 16px; color: #333;">
        Your book <strong>${book.name}</strong> from order <strong>#${mainOrder.orderNumber}</strong> is now marked as:
        <strong style="color: #007bff;">${deliveryStatus}</strong>
      </p>
      <p style="margin-top: 20px; color: #555;">
        You can track your order in your account.<br>
        <strong>Ketabi Team</strong>
      </p>
    </div>
  </div>`;
        }
        else if (paymentStatus) {
            textUpdate = `Your book "${book.name}" from order #${mainOrder.orderNumber} has an updated Payment Status: ${paymentStatus}`;

            htmlUpdate = `
  <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
    <div style="max-width: 600px; margin: auto; background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
      <h2 style="color: #2c3e50;">💳 Payment Update</h2>
      <p style="font-size: 16px; color: #333;">
        The payment status for your book <strong>${book.name}</strong> from order 
        <strong>#${mainOrder.orderNumber}</strong> has been updated to:
        <strong style="color: #007bff;">${paymentStatus}</strong>
      </p>
      <p style="margin-top: 20px; color: #555;">
        Thank you for your purchase!<br>
        <strong>Ketabi Team</strong>
      </p>
    </div>
  </div>`;
        }


        await session.commitTransaction();
        session.endSession();

        await sendEmail({
            to: mainOrder.userEmail,
            subject: `Order Update: ${mainOrder.orderNumber}`,
            text: textUpdate,
            html: htmlUpdate
        });

        return successResponse({
            res,
            statusCode: 200,
            message: "Publisher order and main order updated successfully",
            data: { publisherOrder, mainOrder },
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return next(error);
    }
});


function handleNotificationUpdates(order, paymentStatus, deliveryStatus) {
    const d = deliveryStatus;
    const p = paymentStatus;
    // -------------------------------
    // PAYMENT STATUS HANDLING
    // -------------------------------
    switch (p) {
        case paymentStatus.COMPLETED:
            notifyPaymentSuccess(order);
            break;

        case paymentStatus.FAILED:
            notifyPaymentFailed(order);
            break;

        case paymentStatus.REFUNDED:
            notifyPaymentRefunded(order);
            break;

        case paymentStatus.EXPIRED:
            notifyOrderCancelled(order);
            break;
    }

    // -------------------------------
    // DELIVERY STATUS HANDLING
    // -------------------------------
    switch (d) {
        case deliveryStatus.PENDING:
            break;

        case deliveryStatus.PROCESSING:
            notifyOrderProcessing(order);
            break;

        case deliveryStatus.SHIPPED:
            notifyOrderShipped(order);
            break;

        case deliveryStatus.IN_TRANSIT:
            notifyOrderShipped(order); // same notification for “moving”
            break;

        case deliveryStatus.DELIVERED:
            notifyOrderDelivered(order);

        case deliveryStatus.RETURNED:
            notifyOrderCancelled(order);
            break;
    }
}