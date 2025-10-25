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
import { findByIdAndUpdate, findOne, findOneAndUpdate } from "../models/services/db.js";
import Coupon from "../models/Coupon.js";
import User from "../models/User.js";
import Cart from "../models/Cart.js";
import { successResponse } from "../utils/successResponse.js";
// items (book, quantity, type), shipping address, paymentMethod, isGift, receipient email, personalizedMessage, coupon

async function getCouponData(couponName) {
  if (couponName === "No Coupon" || !couponName) {
    return {
      discountPercentage: 0,
      code: "No Coupon"
    }
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
  const username = req.user.username;

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

  // Validate payment method
  if (!Object.values(paymentMethods).includes(paymentMethod)) {
    return next(new AppError(`Unsupported payment method: ${paymentMethod}`, 400));
  }

  // Validate gift user email
  if (isGift && recipientEmail === userEmail) {
    return next(new AppError(`Can't gift yourself, please give us gift email.`, 400));
  }

  const library = req.user.library || [];
  const libraryBookIds = library.map(item => item.book.toString());

  // Calculate total price & check if EBOOK is already in library
  for (const item of items) {
    const book = await Book.findById(item.book);

    // book not found in DB
    if (!book) {
      return next(new AppError(`Book with ID ${item.book}/ title: ${item.name} not found`, 404));
    }

    // Ebook found in library
    if (item.type === itemType.EBOOK && libraryBookIds.includes(item.book)) {
      return next(new AppError(`${book.name} was found in your library`, 400));
    }

    // Check physical book   stock
    if (item.type === itemType.PHYSICAL && item.quantity > book.stock) {
      return next(new AppError(`Not enough stock for ${book.name} with id: ${book._id}`, 400));
    }

    // Check shipping info if physical
    if (
      item.type === itemType.PHYSICAL &&
      !(shippingAddress.street &&
        shippingAddress.city &&
        shippingAddress.country &&
        shippingAddress.phoneNumber)
    ) {
      return next(
        new AppError(`Incomplete shipping info for ${book.name} with id: ${book._id}`, 400)
      );
    }

    // Handle ebook price
    let itemPrice = book.price;
    if (item.type === itemType.EBOOK) {
      item.quantity = 1;
      itemPrice = book.price * 0.45;
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
  const finalPrice = Math.round(
    totalPrice * (1 - couponDiscountPercentage / 100) * 100
  ) / 100;

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
  console.log('dude: ', payment.client_secret);

  // Clear user's cart immediately
  await findOneAndUpdate(
    Cart,
    { user: userId },
    { $set: { items: [] } },
    { new: true }
  );

  // Return client secret to frontend
  res.status(201).json({
    message: "Order created, awaiting payment confirmation",
    data: order,
    client_secret: payment.client_secret,
  });
});

export const getOrdersAdmin = asyncHandler(async (req, res, next) => {
  const { user, email, orderStatus, orderNumber, paymentStatus, page = 1, limit = 10, sortOrder = "asc", sortBy = "createdAt" } = req.query;

  if (user && email) {
    const error = new AppError("Can't search using both userId and email", 404);
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
