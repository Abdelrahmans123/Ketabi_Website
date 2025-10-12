import mongoose from "mongoose";
import { AppError } from "../utils/AppError"
import { itemType, paymentMethods } from "../utils/orderEnums";
import { Order } from '../models/Order'
import { processPayment } from "../models/services/payment";
import { sendEmail } from "../utils/sendEmail";
import asyncHandler from "../utils/asyncHandler";
const books = mongoose.model('books');

function errorhandler(message, statusCode) {
    return (AppError.create(message, statusCode));
}

export const createOrder = asyncHandler(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { items, discountApplied, shippingAddress, paymentMethod, isGift, recipientEmail, personalizedMessage } = req.body;
        const userId = req.user.id;
        const userEmail = req.user.email;

        if (!items || items.length === 0) {
            return next(errorhandler("Order must contain at least one item", 400));
        }

        // Validate and process each item and their stock status and update stock
        for (const item of items) {
            const book = await books.findById(item.book).session(session);
            if (!book) {
                return next(errorhandler(`Book with ID ${item.book} not found`, 404));
            }
            if (item.type === itemType.PHYSICAL && item.quantity > book.stock) {
                return next(errorhandler(`Not enough stock for book ${book.title}`, 400));
            }
            if (item.type === itemType.PHYSICAL && (shippingAddress.street || shippingAddress.city || shippingAddress.postalCode || shippingAddress.country || shippingAddress.phoneNumber)) {
                return next(errorhandler(`Not enough shipping information to deliver this book: ${book.title}`, 400));
            }
            book.stock -= item.quantity;
            await book.save({ session });
        }

        // Check discount Applied
        if (discountApplied.discountPercentage < 0 || discountApplied.discountPercentage > 100) {
            return next(errorhandler(`This discound is not valid: ${discountApplied.coupon}`, 404));
        }

        // Check payment method
        if (!Object.values(paymentMethods).includes(paymentMethod)) {
            return next(errorhandler(`This payment method is not supported: ${paymentMethod}`, 404));
        }

        // Check recipientEmail
        if (isGift) {
            const receiver = await users.findOne({ email: recipientEmail });
            if (!receiver) {
                return next(errorhandler(`No such user with email: ${recipientEmail}`, 404));
            }
        }

        // Create order
        const order = new Order({
            user: userId,
            userEmail: userEmail,
            items: items,
            discountApplied: discountApplied,
            shippingAddress: shippingAddress,
            paymentMethod: paymentMethod,
            isGift: isGift,
            recipientEmail: recipientEmail,
            personalizedMessage: personalizedMessage
        });

        const payment = await processPayment(order);
        order.transactionId = payment.id;
        order.paymentStatus = paymentStatus.COMPLETED;

        await order.save({ session });

        // Clear cart
        cart.items = [];
        await cart.save({ session });

        // Send emails
        await sendEmail(req.user.email, 'Order Confirmation', `Order ${order.orderNumber} placed successfully!`);
        if (isGift && recipientEmail) {
            await sendEmail(recipientEmail, 'Gift Received', `You received a gift! Redeem at ${order.giftLink}`);
        }

        await session.commitTransaction();
        res.status(201).json({ status: 'success', message: "Order was placed successfully and paid", data: order });

    } catch (error) {
        await session.abortTransaction();
        return next(errorhandler(`Error: ${error}`,400));
    } finally {
        session.endSession();
    }
})

export const getOrderHistory  = asyncHandler(async (req, res, next) => {
    const orders = await Order.find({user: req.user.id}).populate('items.book').sort({createdAt: -1});
    res.status(200).json({status: 'Success', message: "Orders were retreived", data: orders})
})

export const getOrder = asyncHandler( async (req, res, next) => {
    const { orderId } = req.params;
    const order = Order.findById(orderId).populate('items.book');
    if(!order || order.user !== req.user.id){
        return errorhandler('Order not found or unauthorized', 404);
    }
    res.status(200).json({status: 'Success', message: "Order was retreived", data: order})
})