import mongoose from "mongoose";
import AppError from "../utils/AppError.js";
import {
    deliveryStatus,
    itemType,
    paymentMethods,
    paymentStatus,
} from "../utils/orderEnums.js";
import { Order } from "../models/Order.js";
import { processPayment } from "../config/payment.js";
import { sendEmail } from "../utils/sendEmail.js";
import asyncHandler from "../utils/asyncHandler.js";
import Book from "../models/Book.js";
import { findByIdAndUpdate, findOne, findOneAndUpdate } from "../models/services/db.js";
import Coupon from "../models/Coupon.js";
import User from "../models/User.js";
import Cart from "../models/Cart.js";
import { successResponse } from "../utils/successResponse.js";
import { processPaymobPayment } from "../config/paymobPayment.js";
import { notifyOrderCancelled, notifyGiftReceived, notifyOrderConfirmed, notifyOrderDelivered, notifyOrderProcessing, notifyOrderShipped, notifyPaymentFailed, notifyPaymentRefunded, notifyPaymentSuccess } from "../services/OrderNotification.js";
// items (book, quantity, type), shipping address, paymentMethod, isGift, receipient email, personalizedMessage, coupon

async function getCouponData(couponName) {
    if (couponName === "No Coupon" || !couponName) {
        return {
            discountPercentage: 0,
            code: "No Coupon"
        }
    }

    const couponData = await findOne({
        model: Coupon,
        query: { code: couponName },
    });

    if (!couponData) {
        return;
    }

    return couponData;
}

export const createOrder = asyncHandler(async (req, res, next) => {
    let totalPrice = 0;
    const {
        items,
        shippingAddress = { phoneNumber: 'No Phone Number' },
        paymentMethod,
        isGift,
        recipientEmail = req.user.email,
        personalizedMessage,
        coupon = "No Coupon",
    } = req.body;

    const userId = req.user.id;
    const userEmail = req.user.email;
    const userName = req.user.name;

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
        return next(new AppError(`Can't gift yourself.`, 400));
    }

    let library = req.user.library || [];

    // If gift, ensure recipient exists
    if (isGift) {
        const receiver = await findOne({
            model: User,
            query: { email: recipientEmail },
        });

        if (!receiver) {
            return next(new AppError(`No such user: ${recipientEmail}`, 400));
        }
        library = receiver.library || [];
    }


    const session = await mongoose.startSession();
    session.startTransaction();

    const abort = async (msg, code = 400) => {
        await session.abortTransaction();
        try {
            return next(new AppError(msg, code));
        } finally {
            session.endSession();
        }
    };

    const libraryBookIds = library.map(item => item.toString());

    // Calculate total price & check if EBOOK is already in library
    for (const item of items) {
        const book = await Book.findById(item.book).session(session);

        // book not found in DB
        if (!book) {
            return await abort(`Book with ID ${item.book} not found!`, 404);
        }

        // Ebook found in library
        if (item.type === itemType.EBOOK && libraryBookIds.includes(item.book)) {
            if (isGift) return await abort(`The ebook version of ${book.name} was found in his/her ${recipientEmail} library`, 400);
            return await abort(`The ebook version of ${book.name} was found in your library`, 400);
        }

        // Check physical book   stock
        if (item.type === itemType.PHYSICAL) {
            if (item.quantity > book.stock) {
                return await abort(`Not enough stock for ${book.name}`, 400);
            }

            // Reserve stock atomically
            const result = await Book.updateOne(
                { _id: book._id, stock: { $gte: item.quantity } },
                { $inc: { stock: -item.quantity } },
                { session }
            );

            if (result.matchedCount === 0) {
                return await abort(`Not enough stock for ${book.name}`, 400);
            }
        }

        // Check shipping info if physical
        if (
            item.type === itemType.PHYSICAL &&
            !(shippingAddress.street &&
                shippingAddress.city &&
                shippingAddress.phoneNumber)
        ) {
            return await abort(`Incomplete shipping info for ${book.name}`, 400);
        }

        // Handle ebooks
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
        return await abort(
            `Order total (${totalPrice}) is below the coupon minimum (${couponData.minOrderValue})`,
            400
        );
    }

    // Apply coupon discount
    const finalPrice = Math.round(
        totalPrice * (1 - couponDiscountPercentage / 100) * 100
    ) / 100;

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
        shippingAddress: shippingAddress,
        paymentMethod,
        isGift,
        recipientEmail,
        personalizedMessage,
        paymentStatus: paymentStatus.PENDING,
    });

    await order.save({ session });
    await session.commitTransaction();
    session.endSession();
    notifyOrderConfirmed(order);
    let payment;

    try {
        if (paymentMethod === paymentMethods.STRIPE) {
            payment = await processPayment(order);
            order.transactionId = payment.id;
            await order.save();

            return res.status(201).json({
                message: 'Order created, awaiting payment confirmation',
                data: order,
                client_secret: payment.client_secret,
                payment_method: 'Stripe'
            });
        } else if (paymentMethod === paymentMethods.Paymob) {
            payment = await processPaymobPayment(order);
            order.transactionId = payment.id;
            await order.save();

            return res.status(201).json({
                message: 'Order created, awaiting payment confirmation',
                data: order,
                iframe_url: payment.iframe_url,
                payment_token: payment.payment_token,
                payment_method: 'Paymob'
            });
        } else {
            notifyPaymentFailed(order, 'Invalid payment method');
            return next(new AppError('Invalid payment method', 400));
        }

    } catch (error) {
        for (const item of order.items) {
            if (item.type === itemType.PHYSICAL) {
                await Book.updateOne(
                    { _id: item.book },
                    { $inc: { stock: item.quantity } }
                );
            }
        }
        order.paymentStatus = paymentStatus.FAILED;
        await order.save();
        notifyPaymentFailed(order, 'Payment failed')
        return next(
            new AppError(
                `Payment failed. Try again. ${error}`, 502
            )
        );
    }
});

export const getOrdersAdmin = asyncHandler(async (req, res, next) => {
    const { user, email, orderStatus, orderNumber, paymentStatus, page = 1, limit = 10, sortOrder = "asc", sortBy = "createdAt" } = req.query;

    if (user && email) {
        const error = new AppError("Can't search using both userId and email", 404);
        return next(error);
    }

    const filters = {};

    if (user) filters.user = user;
    if (email) filters.userEmail = email;
    if (orderStatus) filters.orderStatus = orderStatus;
    if (orderNumber) filters.orderNumber = orderNumber;
    if (paymentStatus) filters.paymentStatus = paymentStatus;

    // Pagination logic
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sorting logic
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const orders = await Order.find(filters).sort(sort).skip(skip).limit(parseInt(limit));
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
    const userId = req.user.id || req.user._id;

    if (!userId) {
        return next(new AppError('User ID not found in token', 401));
    }

    const { page = 1, limit = 5 } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 5));

    // Pagination
    const skip = (pageNum - 1) * limitNum;

    try {
        const orders = await Order.find({ user: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .populate('items.book', 'name author price discount pdf cover avgRating ratingsCount')
            .lean();

        const total = await Order.countDocuments({ user: userId });

        if (!orders || orders.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No orders found',
                data: {
                    orders: [],
                    pagination: {
                        total: 0,
                        page: pageNum,
                        limit: limitNum,
                        pages: 0,
                    },
                },
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Orders retrieved successfully',
            data: {
                orders: orders,
                pagination: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    pages: Math.ceil(total / limitNum),
                },
            },
        });

    } catch (error) {
        return next(new AppError('Failed to fetch orders: ' + error.message, 500));
    }
});

export const getSingleOrder = asyncHandler(async (req, res, next) => {
    const userId = req.user.id;
    const { orderId } = req.params;

    const order = await Order.findOne({ orderNumber: orderId, user: userId });

    if (!order) {
        return res.status(404).json({ message: "Order not found" });
    }
    
    return successResponse ({
        res,
        statusCode: 200,
        data: order
    });
})