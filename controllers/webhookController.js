import express from "express";
import Stripe from "stripe";
import { Order } from "../models/Order.js";
import User from "../models/User.js";
import Book from "../models/Book.js";
import Coupon from "../models/Coupon.js";
import { sendEmail } from "../utils/sendEmail.js";
import { itemType, paymentStatus } from "../utils/orderEnums.js";
import mongoose from "mongoose";
import { findOneAndUpdate } from "../models/services/db.js";
import PublisherOrder from "../models/publisherOrder.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

router.post(
    "/stripe-webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
        console.log('it is working!');
        const sig = req.headers["stripe-signature"];
        let event;

        try {
            event = stripe.webhooks.constructEvent(
                req.body,
                sig,
                process.env.STRIPE_WEBHOOK_SECRET
            );
        } catch (err) {
            console.error("Webhook signature verification failed:", err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        const paymentIntent = event.data.object;
        const orderNumber = paymentIntent?.metadata?.orderNumber;

        if (!orderNumber) {
            console.warn("No order number found in payment description.");
            return res.status(200).send("No linked order.");
        }

        const order = await Order.findOne({ orderNumber });
        if (!order) {
            console.warn(`No matching order found for ${orderNumber}`);
            return res.status(200).send("Order not found.");
        }

        try {
            switch (event.type) {
                //  Successful payment
                case "payment_intent.succeeded": {
                    const session = await mongoose.startSession();
                    session.withTransaction(async () => {
                        order.paymentStatus = paymentStatus.COMPLETED;
                        order.transactionId = paymentIntent.id;
                        for (const item of order.items) {
                            item.paymentStatus = paymentStatus.COMPLETED
                        }
                        await order.save();

                        // group items by publisher
                        const groupItemsByPublisher = order.items.reduce((acc, item) => {
                            const pubId = item.publisher.toString();
                            if (!acc[pubId]) acc[pubId] = [];
                            acc[pubId].push(item);
                            return acc;
                        }, {});

                        // create one publisher order per publisher
                        for (const [publisherId, publisherItems] of Object.entries(groupItemsByPublisher)) {
                            const totalPrice = publisherItems.reduce((sum, item) => sum + (item.price * item.quantity) - ((item.discount || 0) / 100) * item.price * item.quantity,
                                0
                            );
                            await PublisherOrder.create({
                                publisher: publisherId,
                                order: order._id,
                                items: publisherItems.map(item => ({
                                    book: item.book,
                                    quantity: item.quantity,
                                    price: item.price,
                                    discount: item.discount,
                                    type: item.type,
                                    deliveryStatus: item.deliveryStatus,
                                    paymentStatus: paymentStatus.COMPLETED
                                })),
                                coupon: order.coupon || "No Coupon",
                                couponDiscount: order.discountApplied || 0,
                                totalPrice
                            });
                        }

                        // Update stock quantities
                        for (const item of order.items) {
                            if (item.type === itemType.PHYSICAL) {
                                await Book.findByIdAndUpdate(item.book, {
                                    $inc: { stock: -item.quantity },
                                });
                            }
                        }

                        // Update coupon usage
                        if (order.coupon && order.coupon !== "No Coupon") {
                            await Coupon.findOneAndUpdate(
                                { code: order.coupon },
                                { $inc: { numOfUsers: 1 } }
                            );
                        }
                    });

                    session.endSession();

                    // Send confirmation emails
                    await sendEmail({
                        to: order.userEmail,
                        subject: "Order Confirmation",
                        text: `Your payment for Order ${order.orderNumber} was successful.`,
                    });

                    // Send gift email
                    if (order.isGift && order.recipientEmail) {
                        await sendEmail({
                            to: order.recipientEmail,
                            subject: "Gift Received",
                            text: `You received a gift from ${order.userEmail}! Check your Ketabi library.`
                        });
                    }

                    // add books to the library
                    try {
                        const booksToAdd = order.items
                            .filter(item => item.type === itemType.EBOOK)
                            .map(item => item.book);

                        console.log('BOoks to add: ', booksToAdd);

                        if (booksToAdd.length > 0) {
                            if (order.isGift && order.recipientEmail) {
                                const recipient = await findOneAndUpdate(
                                    User,
                                    { email: order.recipientEmail },
                                    { $addToSet: { library: { $each: booksToAdd } } } // prevent duplicates
                                );
                                console.log("recipient: ", recipient);

                                if (!recipient) {
                                    console.warn(`Recipient not found: ${order.recipientEmail}`);
                                } else {
                                    console.log(`Added ${booksToAdd.length} books to ${recipient.email}'s library (gift).`);
                                }
                            } else {
                                const buyer = await findOneAndUpdate(
                                    User,
                                    { email: order.userEmail },
                                    { $addToSet: { library: { $each: booksToAdd } } }
                                );
                                console.log("buyer: ", buyer);
                                if (!buyer) {
                                    console.warn(`Buyer not found: ${order.userEmail}`);
                                } else {
                                    console.log(`Added ${booksToAdd.length} books to ${buyer.email}'s library.`);
                                }
                            }
                        }
                    } catch (error) {
                        console.error(`Error adding books to library for Order ${order.orderNumber}: ${error.message}`);
                    }

                    console.log(`Payment succeeded for Order ${orderNumber}`);
                    break;
                }

                // Failed payment
                case "payment_intent.payment_failed": {
                    order.paymentStatus = paymentStatus.FAILED;
                    await order.save();

                    const failReason =
                        paymentIntent.last_payment_error?.message || "Unknown reason";

                    await sendEmail({
                        to: order.userEmail,
                        subject: "Payment Failed",
                        text: `Your payment for Order ${order.orderNumber} failed: ${failReason}`,
                    });

                    console.log(`Payment failed for Order ${orderNumber}: ${failReason}`);
                    break;
                }

                // Canceled payment
                case "payment_intent.canceled": {
                    order.paymentStatus = "CANCELED";
                    await order.save();
                    console.log(`Payment canceled for Order ${orderNumber}`);
                    break;
                }

                default:
                    console.log(`Unhandled Stripe event: ${event.type}`);
            }

            res.status(200).json({ received: true });
        } catch (err) {
            console.error(`Webhook processing error: ${err.message}`);
            res.status(500).send("Internal webhook error.");
        }
    }
);

export default router;
