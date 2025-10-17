import mongoose from "mongoose";
import AppError from "../utils/AppError.js";
import { itemType, paymentMethods } from "../utils/orderEnums.js";
import { Order } from "../models/Order.js";
import { processPayment } from "../models/services/payment.js";
import { sendEmail } from "../utils/sendEmail.js";
import asyncHandler from "../utils/asyncHandler.js";
import Book from "../models/Book.js";
import { findOne } from "../models/services/db.js";

export const createOrder = asyncHandler(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    let totalPrice = 0;
    const {
        items,
        discountApplied,
        shippingAddress,
        paymentMethod,
        isGift,
        recipientEmail,
        personalizedMessage,
    } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;
    const username = req.user.username;
    if (!items || items.length === 0) {
        const error = new AppError("No items in the order", 400);
        return next(error);
    }
    if (
        discountApplied.discountPercentage < 0 ||
        discountApplied.discountPercentage > 100
    ) {
        const error = new AppError(
            `This discount is not valid: ${discountApplied.coupon}`,
            404
        );
        return next(error);
    }
    if (!Object.values(paymentMethods).includes(paymentMethod)) {
        const error = new AppError(
            `This payment method is not supported: ${paymentMethod}`,
            404
        );
        return next(error);
    }
    for (const item of items) {
        const book = await Book.findById(item.book).session(session);
        if (!book) {
            const error = new AppError(
                `Book with ID ${item.book} not found`,
                404
            );
            return next(error);
        }
        if (item.type === itemType.PHYSICAL && item.quantity > book.stock) {
            const error = new AppError(
                `Not enough stock for book ${book.title}`,
                400
            );
            return next(error);
        }
        if (
            item.type === itemType.PHYSICAL &&
            (shippingAddress.street ||
                shippingAddress.city ||
                shippingAddress.postalCode ||
                shippingAddress.country ||
                shippingAddress.phoneNumber)
        ) {
            const error = new AppError(
                `Not enough shipping information to deliver this book: ${book.title}`,
                400
            );
            return next(error);
        }
        totalPrice =
            totalPrice + item.price * item.quantity * (1 - item.discount / 100);
        book.stock -= item.quantity;
        await book.save({ session });
    }

    totalPrice = Math.round(totalPrice * 100) / 100;
    const finalPrice =
        Math.round(
            totalPrice * (1 - discountApplied.discountPercentage / 100) * 100
        ) / 100;
    if (isGift) {
        const receiver = await users.findOne({ email: recipientEmail });
        if (!receiver) {
            const error = new AppError(
                `No such user with email: ${recipientEmail}`,
                400
            );
            return next(error);
        }
    }
    const order = new Order({
        user: userId,
        userEmail: userEmail,
        items: items,
        discountApplied: discountApplied,
        finalPrice: finalPrice,
        shippingAddress: shippingAddress,
        paymentMethod: paymentMethod,
        isGift: isGift,
        recipientEmail: recipientEmail,
        personalizedMessage: personalizedMessage,
    });

    const payment = await processPayment(order);
    order.transactionId = payment.id;
    order.paymentStatus = paymentStatus.COMPLETED;
    await order.save({ session });
    cart.items = [];
    await cart.save({ session });
    await sendEmail(
        req.user.email,
        "Order Confirmation",
        `Order ${order.orderNumber} placed successfully!`
    );
    if (isGift && recipientEmail) {
        await sendEmail(
            recipientEmail,
            "Gift Received",
            `You received a gift! Redeem at Ketabi.com! from user: ${username}.`
        );
    }

    await session.commitTransaction();
    res.status(201).json({ data: order, client_secret: payment.client_secret });
});

export const getOrderHistory = asyncHandler(async (req, res, next) => {
    const orders = await findOne(
        Order,
        { user: req.user.id },
        {},
        "items.book",
        { createdAt: -1 }
    );
    if (!orders || orders.length === 0) {
        const error = new AppError("No orders found", 404);
        return next(error);
    }
    res.status(200).json({
        status: "Success",
        message: "Orders were retrieved successfully",
        data: orders,
    });
});

export const getOrder = asyncHandler(async (req, res, next) => {
    const { orderId } = req.params;
    const order = await findOne(
        Order,
        { _id: orderId, user: req.user.id },
        {},
        "items.book"
    );
    if (!order || order.user !== req.user.id) {
        const error = new AppError("Order not found", 404);
        return next(error);
    }
    res.status(200).json({
        status: "Success",
        message: "Order was retrieved successfully",
        data: order,
    });
});
