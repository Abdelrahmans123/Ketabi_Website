import mongoose from "mongoose";
import AppError from "../utils/AppError.js";
import {
  itemType,
  paymentMethods,
  paymentStatus,
} from "../utils/orderEnums.js";
import { Order } from "../models/Order.js";
import { processPayment } from "../config/payment.js";
import { sendEmail } from "../utils/sendEmail.js";
import asyncHandler from "../utils/asyncHandler.js";
import Book from "../models/Book.js";
import { findOne } from "../models/services/db.js";
import Coupon from "../models/Coupon.js";
import User from "../models/User.js";
// items (book, quantity, type), shipping address, paymentMethod, isGift, receipient email, personalizedMessage, coupon

export const createOrder = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  let totalPrice = 0;
  const {
    items,
    shippingAddress,
    paymentMethod,
    isGift,
    recipientEmail,
    personalizedMessage,
    coupon,
  } = req.body;
  const userId = req.user.id;
  const userEmail = req.user.email;
  const username = req.user.username;

  if (!items || items.length === 0) {
    const error = new AppError("No items in the order", 400);
    return next(error);
  }

  let discountPercentage = 0;
  if (coupon !== "No Coupon Used") {
    const couponData = await findOne(Coupon, { code: coupon });
    if (couponData) {
      const error = new AppError(
        `This coupon ${coupon} has no match in the database`,
        404
      );
      return next(error);
    }
    discountPercentage = couponData.discountPercentage;
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
      const error = new AppError(`Book with ID ${item.book} not found`, 404);
      return next(error);
    }

    item.publisher = book.publisher;

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

    if (item.type === itemType.EBOOK) {
      item.quantity = 1;
    }

    totalPrice =
      totalPrice + book.price * item.quantity * (1 - book.discount / 100);
    book.stock -= item.quantity;
    await book.save({ session });
  }

  totalPrice = Math.round(totalPrice * 100) / 100;
  const finalPrice =
    Math.round(totalPrice * (1 - discountPercentage / 100) * 100) / 100;

  if (isGift) {
    const receiver = await findOne(User, { email: recipientEmail });
    if (!receiver) {
      const error = new AppError(
        `No such user with email: ${recipientEmail}`,
        400
      );
      return next(error);
    }
  } else {
    recipientEmail = req.user.email;
  }

  const order = new Order({
    user: userId,
    userEmail: userEmail,
    items: items,
    totalPrice: totalPrice,
    discountApplied: coupon,
    finalPrice: finalPrice,
    shippingAddress: shippingAddress,
    paymentMethod: paymentMethod,
    isGift: isGift,
    recipientEmail: recipientEmail,
    personalizedMessage: personalizedMessage,
    paymentStatus: paymentStatus.PENDING,
  });

  const payment = await processPayment(order);
  order.transactionId = payment.id;
  order.paymentStatus = paymentStatus.COMPLETED;
  await order.save({ session });

  const bookIds = order.items.map(i => i.book);
  await User.findByIdAndUpdate(
    userId,
    { $addToSet: { library: { $each: bookIds } } }, { session });

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
  const orders = await findOne(Order, { user: req.user.id }, {}, "items.book", {
    createdAt: -1,
  });
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
