import express from "express";
import Stripe from "stripe";
import { Order } from "../models/Order.js";
import User from "../models/User.js";
import Book from "../models/Book.js";
import Coupon from "../models/Coupon.js";
import { sendEmail } from "../utils/sendEmail.js";
import { deliveryStatus, itemType, orderStatus, paymentStatus } from "../utils/orderEnums.js";
import mongoose from "mongoose";
import { findOneAndUpdate } from "../models/services/db.js";
import PublisherOrder from "../models/publisherOrder.js";
import Sale from "../models/Sale.js";
import RefundRequest from "../models/refundRequests.js";


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
                        order.orderStatus = orderStatus.CANCELLED;
                        await order.save();

                        await sendEmail({
                            to: order.userEmail,
                            subject: "❌ Payment Failed — Order Canceled",
                            html: `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
          <h2 style="color: #e74c3c; text-align: center;">❌ Payment Failed — Order Canceled</h2>

          <p>Hi <strong>${order.userName}</strong>,</p>

          <p>Unfortunately, your payment for <strong>Order #${order.orderNumber}</strong> could not be completed.</p>

          <p>As a result, the order has been canceled, and any reserved stock for physical books has been restored.</p>

          <p>If this was a mistake, you can place your order again from your cart or contact our support team for help.</p>

          <p style="margin-top: 25px;">Thank you for shopping with us,</p>
          <p style="font-weight: bold;">— The Ketabi Team</p>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #777; text-align: center;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
        `,
                        });
                        break;

                    default:
                        console.log(`Unhandled Stripe event: ${event.type}`);
                }
            } catch (err) {
                console.error(`Async webhook task error: ${err.message}`);
            }
        })();
    }
);

async function handleSuccessfulPayment(order, paymentIntent) {

    // Prevent processing expired or already-paid orders
    if (order.paymentStatus === paymentStatus.EXPIRED) {
        await RefundRequest.create({
            order: order._id,
            user: order.user,
            paymentIntentId: paymentIntent.id,
            reason: "EXPIRED_ORDER",
            amount: paymentIntent.amount / 100,
            status: "PENDING",
            paymentMethod: order.paymentMethod
        });

        await sendEmail({
            to: order.userEmail,
            subject: "⚠️ Payment Pending Review — Order Expired",
            html: `
  <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
    <h2 style="color: #e74c3c; text-align: center;">Order Expired — Payment Pending Review</h2>

    <p>Hi <strong>${order.userName}</strong>,</p>

    <p>We received your payment for <strong>Order #${order.orderNumber}</strong>, 
    but unfortunately, the order had already expired before the payment was confirmed.</p>

    <p>A refund request has been automatically created and is currently 
    <strong>pending review</strong> by our support team. You’ll receive an update as soon as it’s processed.</p>

    <p style="margin-top: 25px;">Thank you for your understanding,</p>
    <p style="font-weight: bold;">— The Ketabi Team</p>

    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />

    <p style="font-size: 12px; color: #777; text-align: center;">
      This is an automated message. Please do not reply to this email.
    </p>
  </div>
  `,
        });

        return;
    }

    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            order.paymentStatus = paymentStatus.COMPLETED;
            order.transactionId = paymentIntent.id;
            order.orderStatus = orderStatus.PROCESSING;
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
                const finalPrice = totalPrice * (1 - (order.discountApplied || 0) / 100);
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
                    finalPrice,
                    ...(isShippingNeeded && { shippingAddress: order.shippingAddress }),
                };

                const [createdPubOrder] = await PublisherOrder.create([pubOrder], { session });

                // Record in Sales
                const saleItems = items.map((item) => ({
                    book: item.book,
                    quantity: item.quantity,
                    price: item.price,
                    discount: item.discount,
                    type: item.type,
                    total:
                        item.price * item.quantity -
                        ((item.discount || 0) / 100) * item.price * item.quantity,
                }));

                await Sale.create(
                    [
                        {
                            publisher: publisherId,
                            publisherOrder: createdPubOrder._id,
                            order: order._id,
                            items: saleItems,
                            totalAmount: saleItems.reduce((sum, i) => sum + i.total, 0),
                            finalPrice: (saleItems.reduce((sum, i) => sum + i.total, 0)) * (1 - (order.discountApplied || 0) / 100),
                            coupon: order.coupon || "No Coupon",
                            couponDiscount: order.discountApplied || 0,
                            paymentIntentId: paymentIntent.id,
                            paymentMethod: order.paymentMethod
                        },
                    ],
                    { session }
                );
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
    const books = await Book.find({ _id: { $in: bookIds } }).select("name");
    const bookNames = books.map(b => `- ${b.name}`).join("\n");

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
        subject: "✅ Order Confirmation — Payment Successful",
        html: `
  <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
    <h2 style="color: #2ecc71; text-align: center;">🎉 Order Confirmed!</h2>

    <p>Hi <strong>${buyerName}</strong>,</p>

    <p>Your payment for <strong>Order #${order.orderNumber}</strong> was successful.</p>

    <p><strong>Books you purchased:</strong></p>
    <div style="background: #f9f9f9; padding: 10px 15px; border-radius: 6px; white-space: pre-line;">
      ${bookNames}
    </div>

    ${order.isGift
                ? `<p>You sent these as a gift to <strong>${recipientEmail}</strong>.</p>`
                : `<p>Thank you for your purchase! We hope you enjoy your new books 📚.</p>`
            }

    <p style="margin-top: 25px;">Warm regards,</p>
    <p style="font-weight: bold;">— The Ketabi Team</p>

    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
    <p style="font-size: 12px; color: #777; text-align: center;">
      This is an automated message. Please do not reply to this email.
    </p>
  </div>
  `,
    }).catch(console.error);

    // Gift email
    if (order.isGift && order.recipientEmail) {
        sendEmail({
            to: recipientEmail,
            subject: "🎁 You've Received a Gift from Ketabi!",
            html: `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
      <h2 style="color: #3498db; text-align: center;">🎁 You've Received a Gift!</h2>

      <p>Hi <strong>${recipientName}</strong>,</p>

      <p>You’ve received the following books as a gift from <strong>${buyerEmail}</strong>:</p>

      <div style="background: #f9f9f9; padding: 10px 15px; border-radius: 6px; white-space: pre-line;">
        ${bookNames}
      </div>

      ${order.personalizedMessage
                    ? `<p style="margin-top: 15px;"><em>Personal message:</em> "${order.personalizedMessage}"</p>`
                    : ""
                }

      <p>Enjoy your reading adventure 📖!</p>

      <p style="margin-top: 25px;">With love,</p>
      <p style="font-weight: bold;">— The Ketabi Team</p>

      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
      <p style="font-size: 12px; color: #777; text-align: center;">
        This is an automated message. Please do not reply to this email.
      </p>
    </div>
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
    await findOneAndUpdate({
        model: User,
        query: { email },
        data: update,
    });

}

export default router;