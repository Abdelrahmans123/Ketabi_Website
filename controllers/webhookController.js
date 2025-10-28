import express from "express";
import Stripe from "stripe";
import { Order } from "../models/Order.js";
import User from "../models/User.js";
import Book from "../models/Book.js";
import Coupon from "../models/Coupon.js";
import { sendEmail } from "../utils/sendEmail.js";
import { deliveryStatus, itemType, paymentStatus } from "../utils/orderEnums.js";
import mongoose from "mongoose";
import { findOneAndUpdate } from "../models/services/db.js";
import PublisherOrder from "../models/publisherOrder.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

router.post(
    "/stripe-webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
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

        // responding to stripe
        res.status(200).json({ received: true });

        (async () => {
            try {
                const order = await Order.findOne({ orderNumber });
                if (!order) {
                    console.warn(`No order found for ${orderNumber}`);
                    return;
                }

                switch (event.type) {
                    case "payment_intent.succeeded":
                        await handleSuccessfulPayment(order, paymentIntent);
                        break;

                    case "payment_intent.payment_failed":
                    case "payment_intent.canceled":
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

                        await sendEmail({
                            to: order.userEmail,
                            subject: "Payment Failed",
                            text: `Your payment for Order ${order.orderNumber} failed.`,
                        });
                        break;

                    default:
                        console.log(`Unhandled Stripe event: ${event.type}`);
                }
            } catch (err) {
                console.error(`Async webhook task error: ${err.message}`);
            }
        })();

        /* try {
            switch (event.type) {
                //  Successful payment
                case "payment_intent.succeeded": {
                    const session = await mongoose.startSession();
                    session.withTransaction(async () => {
                        order.paymentStatus = paymentStatus.COMPLETED;
                        order.transactionId = paymentIntent.id;
                        let isShippingNeeded = false;
                        for (const item of order.items) {
                            item.paymentStatus = paymentStatus.COMPLETED
                            if (item.type === itemType.EBOOK) item.deliveryStatus = deliveryStatus.DELIVERED;
                            else isShippingNeeded = true;
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
                            const pubOrder = {
                                publisher: publisherId,
                                order: order._id,
                                name: order.userName,
                                email: order.userEmail,
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
                            }
                            if (isShippingNeeded) {
                                pubOrder.shippingAddress = order.shippingAddress;
                            }
                            await PublisherOrder.create(pubOrder);
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
                            text: `You received a gift from ${order.userEmail}! with message: ${order.personalizedMessage || 'Congratulations!'}.`
                        });
                    }

                    // add books to the library
                    try {
                        const allBooks = order.items.map(item => item.book);
                        const ebooks = order.items
                            .filter(item => item.type === itemType.EBOOK)
                            .map(item => item.book);

                        console.log("Books to add (all):", allBooks);
                        console.log("Books to add (ebooks):", ebooks);

                        const updateUserBooks = async (email) => {
                            const update = {
                                $addToSet: {
                                    purchasedBooks: { $each: allBooks },
                                },
                            };

                            if (ebooks.length > 0) {
                                update.$addToSet.library = { $each: ebooks };
                            }

                            const user = await findOneAndUpdate(User, { email }, update);

                            if (!user) {
                                console.warn(`User not found: ${email}`);
                            } else {
                                console.log(
                                    `Added ${allBooks.length} books to ${user.email}'s purchasedBooks` +
                                    (ebooks.length ? ` and ${ebooks.length} to library` : "") +
                                    "."
                                );
                            }
                        };

                        // gift vs. normal purchase
                        if (order.isGift && order.recipientEmail) {
                            await updateUserBooks(order.recipientEmail);
                        } else {
                            await updateUserBooks(order.userEmail);
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
        } */
    }
);

async function handleSuccessfulPayment(order, paymentIntent) {

    // Prevent processing expired or already-paid orders
    if (
        order.paymentStatus === paymentStatus.COMPLETED ||
        order.paymentStatus === paymentStatus.EXPIRED
    ) {
        console.warn(
            `⚠️ Payment received for order ${order._id} but it's already ${order.paymentStatus}. Ignoring.`
        );
        return;
    }

    if (order.expiresAt && order.expiresAt < new Date()) {
        console.warn(`⚠️ Payment received for expired order ${order._id}. Ignoring.`);

        await RefundRequest.create({
            order: order._id,
            user: order.user,
            paymentIntentId: paymentIntent.id,
            reason: "EXPIRED_ORDER",
            amount: paymentIntent.amount / 100,
            status: "PENDING",
        });

        await sendEmail({
            to: order.userEmail,
            subject: "Payment Pending Review - Order Expired",
            text: `
Hi ${order.userName},

We received your payment for Order #${order.orderNumber}, but the order had already expired.

A refund request has been automatically logged and is pending review by our support team.
You’ll receive an update shortly.

- The Ketabi Team
`,
        });

        return;
    }

    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            order.paymentStatus = paymentStatus.COMPLETED;
            order.transactionId = paymentIntent.id;

            let isShippingNeeded = false;
            for (const item of order.items) {
                item.paymentStatus = paymentStatus.COMPLETED;
                if (item.type === itemType.EBOOK)
                    item.deliveryStatus = deliveryStatus.DELIVERED;
                else isShippingNeeded = true;
            }

            await order.save({ session });

            // Group items by publisher
            const grouped = order.items.reduce((acc, item) => {
                const pubId = item.publisher.toString();
                if (!acc[pubId]) acc[pubId] = [];
                acc[pubId].push(item);
                return acc;
            }, {});

            for (const [publisherId, items] of Object.entries(grouped)) {
                const totalPrice = items.reduce(
                    (sum, item) =>
                        sum +
                        item.price * item.quantity -
                        ((item.discount || 0) / 100) * item.price * item.quantity,
                    0
                );

                const pubOrder = {
                    publisher: publisherId,
                    order: order._id,
                    name: order.userName,
                    email: order.userEmail,
                    items: items.map((item) => ({
                        book: item.book,
                        quantity: item.quantity,
                        price: item.price,
                        discount: item.discount,
                        type: item.type,
                        deliveryStatus: item.deliveryStatus,
                        paymentStatus: paymentStatus.COMPLETED,
                    })),
                    coupon: order.coupon || "No Coupon",
                    couponDiscount: order.discountApplied || 0,
                    totalPrice,
                    ...(isShippingNeeded && { shippingAddress: order.shippingAddress }),
                };

                await PublisherOrder.create([pubOrder], { session });
            }

            // Atomic stock update: ensure stock doesn’t go below 0
            for (const item of order.items) {
                if (item.type === itemType.PHYSICAL) {
                    const result = await Book.updateOne(
                        { _id: item.book, stock: { $gte: item.quantity } },
                        { $inc: { stock: -item.quantity } },
                        { session }
                    );
                    if (result.matchedCount === 0) {
                        throw new Error(`Insufficient stock for book ${item.book}`);
                    }
                }
            }

            // Coupon usage
            if (order.coupon && order.coupon !== "No Coupon") {
                await Coupon.findOneAndUpdate(
                    { code: order.coupon },
                    { $inc: { numOfUsers: 1 } },
                    { session }
                );
            }
        });
    } finally {
        await session.endSession();
    }

    // book list for email 
    const bookIds = order.items.map(item => item.book);
    const books = await Book.find({ _id: { $in: bookIds } }).select("title");
    const bookNames = books.map(b => `- ${b.title}`).join("\n");

    // Adjust user info if this is a gift
    let buyerName = order.userName;
    let buyerEmail = order.userEmail;
    let recipientName = buyerName;
    let recipientEmail = buyerEmail;

    if (order.isGift && order.recipientEmail) {
        recipientEmail = order.recipientEmail;
        recipientName = order.recipientName || "Gift Recipient";
        order.userName = recipientName;
        order.userEmail = recipientEmail;
    }

    // 
    // Email to buyer
    sendEmail({
        to: buyerEmail,
        subject: "Order Confirmation",
        text: `
Hi ${buyerName},

Your payment for Order #${order.orderNumber} was successful. 🎉

Here are the books you purchased:
${bookNames}

${order.isGift
                ? `\nYou sent these as a gift to ${recipientEmail}.`
                : "\nThank you for your purchase!"
            }

- The Ketabi Team
`,
    }).catch(console.error);

    // Gift email
    if (order.isGift && order.recipientEmail) {
        sendEmail({
            to: recipientEmail,
            subject: "🎁 You've received a gift!",
            text: `
Hi ${recipientName},

You’ve received the following books as a gift from ${buyerEmail}:

${bookNames}

${order.personalizedMessage
                    ? `\nPersonal message: "${order.personalizedMessage}"`
                    : ""
                }

Enjoy your reading!
- The Ketabi Team
`,
        }).catch(console.error);
    }

    // library update 
    updateUserBooks(order).catch(console.error);
}

async function updateUserBooks(order) {
    const allBooks = order.items.map((item) => item.book);
    const ebooks = order.items
        .filter((item) => item.type === itemType.EBOOK)
        .map((item) => item.book);

    const update = {
        $addToSet: { purchasedBooks: { $each: allBooks } },
    };
    if (ebooks.length) update.$addToSet.library = { $each: ebooks };

    const email = order.isGift ? order.recipientEmail : order.userEmail;
    await findOneAndUpdate(User, { email }, update);
}

export default router;
