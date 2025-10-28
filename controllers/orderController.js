import mongoose from "mongoose";
import AppError from "../utils/AppError.js";
import {
    deliveryStatus,
    itemType,
    paymentMethods,
    paymentStatus,
    orderStatus,
} from "../utils/orderEnums.js";
import { Order } from "../models/Order.js";
import { processPayment } from "../config/payment.js";
import { sendEmail } from "../utils/sendEmail.js";
import asyncHandler from "../utils/asyncHandler.js";
import Book from "../models/Book.js";
import {
    findById,
    findByIdAndUpdate,
    findOne,
    findOneAndUpdate,
} from "../models/services/db.js";
import Coupon from "../models/Coupon.js";
import User from "../models/User.js";
import Cart from "../models/Cart.js";
import { successResponse } from "../utils/successResponse.js";
import {
    notifyOrderConfirmed,
    notifyOrderProcessing,
    notifyOrderShipped,
    notifyOrderDelivered,
    notifyOrderCancelled,
    notifyPaymentRefunded,
} from "../services/OrderNotification.js";
// items (book, quantity, type), shipping address, paymentMethod, isGift, receipient email, personalizedMessage, coupon

async function getCouponData(couponName) {
    if (couponName === "No Coupon" || !couponName) {
        return {
            discountPercentage: 0,
            code: "No Coupon",
        };
    }

    const couponData = await findOne(Coupon, { code: couponName });
    if (!couponData) {
        return;
    }

    return couponData;
}

export const createOrder = asyncHandler(async (req, res, next) => {
    let totalPrice = 0;
    const {
        items,
        shippingAddress,
        paymentMethod,
        isGift,
        recipientEmail = req.user.email,
        personalizedMessage,
        coupon = "No Coupon",
    } = req.body;

    const userId = req.user.id;
    const userEmail = req.user.email;
    const userName = req.user.name;

    // Validate items
    if (!items || items.length === 0) {
        return next(new AppError("No items in the order", 400));
    }

    // Validate coupon
    const couponData = await getCouponData(coupon);
    if (!couponData) {
        return next(new AppError(`This coupon ${coupon} was not found`, 404));
    }

    if (coupon !== "No Coupon") {
        if (couponData.numOfUsers >= couponData.usageLimit) {
            return next(
                new AppError(
                    `Coupon ${coupon} has reached its maximum usage limit.`,
                    400
                )
            );
        }
        if (!couponData.isActive || couponData.expiryDate < new Date()) {
            return next(new AppError(`Coupon ${coupon} is expired`, 400));
        }
    }

    const couponDiscountPercentage = couponData.discountPercentage;

    // Validate gift user email
    if (isGift && recipientEmail === userEmail) {
        return next(
            new AppError(`Can't gift yourself, please give us gift email.`, 400)
        );
    }

    const library = req.user.library || [];
    const libraryBookIds = library.map((item) => item.toString());

    // Calculate total price & check if EBOOK is already in library
    for (const item of items) {
        const book = await findById({ model: Book, id: item.book });

        // book not found in DB
        if (!book) {
            return next(
                new AppError(
                    `Book with ID ${item.book}/ title: ${item.name} not found`,
                    404
                )
            );
        }

        // Ebook found in library
        if (
            item.type === itemType.EBOOK &&
            libraryBookIds.includes(item.book)
        ) {
            return next(
                new AppError(`${book.name} was found in your library`, 400)
            );
        }

        // Check physical book   stock
        if (item.type === itemType.PHYSICAL && item.quantity > book.stock) {
            return next(
                new AppError(
                    `Not enough stock for ${book.name} with id: ${book._id}`,
                    400
                )
            );
        }

        // Check shipping info if physical
        if (
            item.type === itemType.PHYSICAL &&
            !(
                shippingAddress.street &&
                shippingAddress.city &&
                shippingAddress.country &&
                shippingAddress.phoneNumber
            )
        ) {
            return next(
                new AppError(
                    `Incomplete shipping info for ${book.name} with id: ${book._id}`,
                    400
                )
            );
        }

        // Handle ebook price
        let itemPrice = book.price;
        if (item.type === itemType.EBOOK) {
            item.quantity = 1;
            itemPrice = book.price * 0.45;
            item.deliveryStatus = deliveryStatus.DELIVERED;
        }

        item.publisher = book._doc.publisher;
        // Attach price
        item.price = itemPrice;
        totalPrice += itemPrice * item.quantity * (1 - book.discount / 100);
        item.discount = book.discount;
        item.paymentStatus = paymentStatus.PENDING;
    }

    totalPrice = Math.round(totalPrice * 100) / 100;

    // Check coupon minimum order
    if (coupon !== "No Coupon" && totalPrice < couponData.minOrderValue) {
        return next(
            new AppError(
                `Order total (${totalPrice}) is below the coupon minimum (${couponData.minOrderValue})`,
                400
            )
        );
    }

    // Apply coupon discount
    const finalPrice =
        Math.round(totalPrice * (1 - couponDiscountPercentage / 100) * 100) /
        100;

    // If gift, ensure recipient exists
    if (isGift) {
        const receiver = await findOne(User, { email: recipientEmail });
        if (!receiver) {
            return next(new AppError(`No such user: ${recipientEmail}`, 400));
        }
    }

    // Create order (PENDING)
    const order = new Order({
        user: userId,
        userEmail,
        userName,
        items,
        totalPrice,
        coupon: couponData.code,
        discountApplied: couponDiscountPercentage,
        finalPrice,
        shippingAddress,
        paymentMethod,
        isGift,
        recipientEmail,
        personalizedMessage,
        paymentStatus: paymentStatus.PENDING,
    });

    await order.save();
    // Create Stripe payment intent
    const payment = await processPayment(order);

    // Attach Stripe info (still pending)
    order.transactionId = payment.id;
    await order.save();

    // Send order confirmed notification
    await notifyOrderConfirmed(order);

    await findOneAndUpdate({
        model: Cart,
        filter: { user: userId },
        update: { $set: { items: [] } },
    });

    // Return client secret to frontend
    res.status(201).json({
        message: "Order created, awaiting payment confirmation",
        data: order,
        client_secret: payment.client_secret,
    });
});

export const getOrdersAdmin = asyncHandler(async (req, res, next) => {
    const {
        user,
        email,
        orderStatus,
        orderNumber,
        paymentStatus,
        page = 1,
        limit = 10,
        sortOrder = "asc",
        sortBy = "createdAt",
    } = req.query;

    if (user && email) {
        const error = new AppError(
            "Can't search using both userId and email",
            404
        );
        return next(error);
    }

    const filters = {};

    if (user) filters.user = user;
    if (email) filters.email = email;
    if (orderStatus) filters.orderStatus = orderStatus;
    if (orderNumber) filters.orderNumber = orderNumber;
    if (paymentStatus) filters.paymentStatus = paymentStatus;

    // Pagination logic
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sorting logic
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const orders = await findAll({
        model: Order,
        filter: filters,
        sort,
        skip,
        limit: parseInt(limit),
    });
    const total = await Order.countDocuments(filters);

    if (!orders || orders.length === 0) {
        return successResponse({
            res,
            statusCode: 200,
            message: "No orders Found",
            data: [],
        });
    }

    return successResponse({
        res,
        statusCode: 200,
        message: "Orders retrieved successfully",
        data: {
            orders: orders,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit),
            },
        },
    });
});

export const getOrderHistory = asyncHandler(async (req, res, next) => {
    const { user, page = 1, limit = 5 } = req.query;

    if (user !== req.user.id) {
        const error = new AppError("Nothing to show here", 404);
        return next(error);
    }

    // Pagination logic
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await findAll({
        model: Order,
        filter: { user },
        skip,
        limit: parseInt(limit),
    });
    const total = await Order.countDocuments(user);

    if (!orders || orders.length === 0) {
        return successResponse({
            res,
            statusCode: 200,
            message: "No orders Found",
            data: [],
        });
    }

    return successResponse({
        res,
        statusCode: 200,
        message: "Orders retrieved successfully",
        data: {
            orders: orders,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit),
            },
        },
    });
});

export const updateOrderStatus = asyncHandler(async (req, res, next) => {
    const { orderId } = req.params;
    const { status, trackingNumber } = req.body;

    const validStatuses = Object.values(orderStatus);
    if (!validStatuses.includes(status)) {
        return next(new AppError(`Invalid order status: ${status}`, 400));
    }

    const order = await findById({ model: Order, id: orderId });
    if (!order) {
        return next(new AppError("Order not found", 404));
    }

    const oldStatus = order.orderStatus;
    order.orderStatus = status;
    await order.save();

    switch (status) {
        case orderStatus.PROCESSING:
            await notifyOrderProcessing(order);
            break;
        case orderStatus.SHIPPED:
            await notifyOrderShipped(order, trackingNumber);
            break;
        case orderStatus.DELIVERED:
            await notifyOrderDelivered(order);
            break;
        case orderStatus.CANCELLED:
            const cancellationReason =
                req.body.reason || "Order cancelled by admin";
            await notifyOrderCancelled(order, cancellationReason);
            break;
    }

    return successResponse({
        res,
        statusCode: 200,
        message: `Order status updated from ${oldStatus} to ${status}`,
        data: order,
    });
});

export const cancelOrder = asyncHandler(async (req, res, next) => {
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await findById({ model: Order, id: orderId });
    if (!order) {
        return next(new AppError("Order not found", 404));
    }
    if (order.user.toString() !== req.user.id && req.user.role !== "admin") {
        return next(
            new AppError("You don't have permission to cancel this order", 403)
        );
    }
    if (
        order.orderStatus === orderStatus.DELIVERED ||
        order.orderStatus === orderStatus.CANCELLED
    ) {
        return next(
            new AppError(
                `Cannot cancel order with status: ${order.orderStatus}`,
                400
            )
        );
    }

    order.orderStatus = orderStatus.CANCELLED;
    await order.save();
    if (order.paymentStatus === paymentStatus.COMPLETED) {
        order.paymentStatus = paymentStatus.REFUNDED;
        await order.save();
        await notifyPaymentRefunded(order);
    }
    await notifyOrderCancelled(order, reason || "Cancelled by user");
    return successResponse({
        res,
        statusCode: 200,
        message: "Order cancelled successfully",
        data: order,
    });
});

export const getOrderById = asyncHandler(async (req, res, next) => {
    const { orderId } = req.params;

    const order = await findById({ model: Order, id: orderId });

    if (!order) {
        return next(new AppError("Order not found", 404));
    }
    if (
        order.user._id.toString() !== req.user.id &&
        req.user.role !== "admin"
    ) {
        return next(
            new AppError("You don't have permission to view this order", 403)
        );
    }

    return successResponse({
        res,
        statusCode: 200,
        message: "Order retrieved successfully",
        data: order,
    });
});
