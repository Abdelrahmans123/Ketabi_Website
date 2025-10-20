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
import { findByIdAndUpdate, findOne } from "../models/services/db.js";
import Coupon from "../models/Coupon.js";
import User from "../models/User.js";
import Cart from "../models/Cart.js"
// items (book, quantity, type), shipping address, paymentMethod, isGift, receipient email, personalizedMessage, coupon

export const createOrder = asyncHandler(async (req, res, next) => {

  let totalPrice = 0;
  const {
    items,
    shippingAddress,
    paymentMethod,
    isGift,
    recipientEmail = req.user.email,
    personalizedMessage,
    coupon,
  } = req.body;
  const userId = req.user.id;
  const userEmail = req.user.email;
  const username = req.user.username;

  // check items count
  if (!items || items.length === 0) {
    const error = new AppError("No items in the order", 400);
    return next(error);
  }

  // check coupon 
  let discountPercentage = 0;
  const couponData = await findOne(Coupon, { code: coupon });
  if (!couponData) {
    const error = new AppError(
      `This coupon ${coupon} has no match in the database`,
      404
    );
    return next(error);
  }

  // check if usage limit has been exceeded
  if (couponData.numOfUsers >= couponData.usageLimit) {
    const error = new AppError(
      `The total number of users have been reached for this coupon: ${coupon}`,
      404
    );
    return next(error);
  }

  // check if coupon is active & not expired
  if (!couponData.isActive || couponData.expiryDate < new Date()) {
    const error = new AppError(
      `This coupon: ${coupon} is expired`,
      404
    );
    return next(error);
  }

  // checks for the coupon has been cleared (except for the total price)
  discountPercentage = couponData.discountPercentage;

  // check payment methods
  if (!Object.values(paymentMethods).includes(paymentMethod)) {
    const error = new AppError(
      `This payment method is not supported: ${paymentMethod}`,
      404
    );
    return next(error);
  }

  // start the session & the transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  // loop over items in the order
  for (const item of items) {
    const book = await Book.findById(item.book).session(session);

    // check book existing or not
    if (!book) {
      const error = new AppError(`Book with ID ${item.book} not found`, 404);
      return next(error);
    }

    // check stock if type is physical
    if (item.type === itemType.PHYSICAL && item.quantity > book.stock) {
      const error = new AppError(
        `Not enough stock for book ${book.title}`,
        400
      );
      return next(error);
    }

    // check shipping address if type is physical
    if (
      item.type === itemType.PHYSICAL &&
      !(shippingAddress.street ||
        shippingAddress.city ||
        shippingAddress.postalCode ||
        shippingAddress.country ||
        shippingAddress.phoneNumber)
    ) {
      const error = new AppError(
        `Not enough shipping information to deliver this book: ${book.name}`,
        400
      );
      return next(error);
    }

    // get price from the book doc
    let itemPrice = book.price;

    // if book type is ebook, set quantiy to 1 & price to 45% of the original price
    if (item.type === itemType.EBOOK) {
      item.quantity = 1;
      itemPrice = book.price * 0.45;
    }

    // add the price to the item
    item.price = itemPrice;

    // get total price 
    totalPrice = totalPrice + itemPrice * item.quantity * (1 - book.discount / 100);

    // update stock of the book
    if (item.type === itemType.PHYSICAL) {
      book.stock -= item.quantity;
      await book.save({ session });
    }
  }

  // round total price to xxxx.xx
  totalPrice = Math.round(totalPrice * 100) / 100;

  // check minimum order value of the coupon to the total price
  if (totalPrice < couponData.minOrderValue) {
    const error = `Not enough total to use this coupon. minimum order is ${couponData.minOrderValue}`;
    return next(error, 404);
  }

  // final price after coupon discount
  const finalPrice = Math.round(totalPrice * (1 - discountPercentage / 100) * 100) / 100;

  // Update coupon number of users
  if (coupon) {
    await findByIdAndUpdate(
      Coupon, couponData._id,
      { $inc: { numOfUsers: 1 } },
      { session, new: true }
    );
  }

  // check if order is a gift
  if (isGift) {
    // check if receiver exists
    const receiver = await findOne(User, { email: recipientEmail });
    if (!receiver) {
      const error = new AppError(
        `No such user with email: ${recipientEmail}`,
        400
      );
      return next(error);
    }
  }

  // create order structure
  const order = new Order({
    user: userId,
    userEmail: userEmail,
    items: items,
    totalPrice: totalPrice,
    discountApplied: discountPercentage,
    finalPrice: finalPrice,
    shippingAddress: shippingAddress,
    paymentMethod: paymentMethod,
    isGift: isGift,
    recipientEmail: recipientEmail,
    personalizedMessage: personalizedMessage,
    paymentStatus: paymentStatus.PENDING,
  });

  await order.save({ session });

  // update cart to be empty
  await findOneAndUpdate(
    Cart,
    { user: userId },
    { $set: { items: [] } },
    { session, new: true }
  );

  // commit the changes to the database
  await session.commitTransaction();
  session.endSession();

  // start payment 
  const payment = await processPayment(order);

  // update payment status
  order.transactionId = payment.id;
  order.paymentStatus = paymentStatus.COMPLETED;
  await order.save();

  // send email to the buyer
  await sendEmail(
    req.user.email,
    "Order Confirmation",
    `Order ${order.orderNumber} placed successfully!`
  );

  // send email to the gifted user
  if (isGift && recipientEmail) {
    await sendEmail(
      recipientEmail,
      "Gift Received",
      `You received a gift! Redeem at Ketabi.com! from user: ${username}.`
    );
  }

  
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
