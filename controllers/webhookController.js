import express from "express";
import Stripe from "stripe";
import { Order } from "../models/Order.js";
import Book from "../models/Book.js";
import Coupon from "../models/Coupon.js";
import { sendEmail } from "../utils/sendEmail.js";
import { paymentStatus } from "../utils/orderEnums.js";
import mongoose from "mongoose";

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
        const orderNumber = paymentIntent?.description?.split(" ")[1];

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
                    session.startTransaction(async () => {
                        order.paymentStatus = paymentStatus.COMPLETED;
                        order.transactionId = paymentIntent.id;
                        await order.save();

                        // Update stock quantities
                        for (const item of order.items) {
                            if (item.type === "PHYSICAL") {
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
