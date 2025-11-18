import asyncHandler from '../utils/asyncHandler.js';
import { verifyPaymobHMAC, getPaymobTransaction } from '../config/paymobPayment.js';
import { Order } from '../models/Order.js';
import { paymentStatus, orderStatus, deliveryStatus, itemType } from '../utils/orderEnums.js';
import { sendEmail } from '../utils/sendEmail.js';
import User from '../models/User.js';
import Book from '../models/Book.js';
import Coupon from '../models/Coupon.js';
import AppError from '../utils/AppError.js';
import Sale from '../models/Sale.js';
import PublisherOrder from '../models/publisherOrder.js';
import { notifyOrderCancelled, notifyGiftReceived, notifyOrderConfirmed, notifyOrderDelivered, notifyOrderProcessing, notifyOrderShipped, notifyPaymentFailed, notifyPaymentRefunded, notifyPaymentSuccess } from "../services/OrderNotification.js";
import mongoose from "mongoose";

const processedWebhooks = new Set();

export const handlePaymobCallback = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        // Extract callback data
        let callbackData;
        const receivedHmac = req.query.hmac || req.body?.hmac;

        if (req.method === 'GET') {
            const merchantOrderId = req.query.merchant_order_id;
            if (merchantOrderId) {
                // GET Request - Redirecting from Paymob
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
                const redirectUrl = `${frontendUrl}/order-success/${merchantOrderId}`;
                return res.redirect(302, redirectUrl);
            }
            return res.status(200).json({ message: 'OK' });
        }

        if (req.method !== 'POST') {
            return res.status(200).json({ message: 'OK' });
        }

        if (!req.body?.obj) {
            console.error('Missing POST body');
            return res.status(400).json({ error: 'Invalid POST data' });
        }

        callbackData = req.body.obj;

        if (!receivedHmac || !callbackData) {
            return res.status(400).json({ error: 'Invalid callback data' });
        }

        // Verify HMAC
        const isValidHmac = verifyPaymobHMAC(callbackData, receivedHmac);
        if (!isValidHmac) {
            return res.status(401).json({ error: 'Invalid HMAC signature' });
        }

        // Get merchant order ID
        const merchantOrderId = callbackData.order?.merchant_order_id;

        // Extract transaction details
        const transactionId = callbackData.id;
        const transactionSuccess = callbackData.success === true;
        const isPending = callbackData.pending === false;

        if (!merchantOrderId) {
            return res.status(400).json({ error: 'Merchant Order ID missing' });
        }

        // Idempotency check
        const idempotencyKey = `paymob_${transactionId}`;
        if (processedWebhooks.has(idempotencyKey)) {
            // Webhook already processed
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
            const redirectUrl = `${frontendUrl}/order-success?orderId=${merchantOrderId}&status=success`;
            return res.redirect(302, redirectUrl);
        }

        // Find order
        const order = await Order.findOne({ orderNumber: merchantOrderId });
        if (!order) {
            console.error('Order not found:', merchantOrderId);
            return res.status(404).json({ error: 'Order not found' });
        }

        // Check if already paid
        if (order.paymentStatus === paymentStatus.COMPLETED) {
            // Order already paid
            processedWebhooks.add(idempotencyKey);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
            const redirectUrl = `${frontendUrl}/order-success?orderId=${order.orderNumber}&status=success`;
            return res.redirect(302, redirectUrl);
        }

        // Update transaction ID
        if (!order.transactionId) {
            order.transactionId = transactionId.toString();
        }
        let isShippingNeeded = false;

        // HANDLE PAYMENT SUCCESS
        if (transactionSuccess && isPending) {
            notifyPaymentSuccess(order);
            notifyOrderProcessing(order);
            // Processing successful payment

            // Update order status
            order.paymentStatus = paymentStatus.COMPLETED;
            order.orderStatus = orderStatus.PROCESSING;

            // Update item payment statuses
            order.items.forEach(item => {
                item.paymentStatus = paymentStatus.COMPLETED;
                if(item.type === itemType.PHYSICAL) isShippingNeeded = true;
            });

            // Handle ebook delivery
            const ebooksInOrder = order.items.filter(item => item.type === itemType.EBOOK);
            if (ebooksInOrder.length > 0) {
                // Processing ebooks
                const recipientEmail = order.isGift ? order.recipientEmail : order.userEmail;
                if (order.isGift) {
                    const giftUser = findOne({ model: User, query: { email: order.recipientEmail } });
                    notifyGiftReceived(giftUser._id, order);
                }
                const recipient = await User.findOne({ email: recipientEmail });

                if (recipient) {
                    const bookIds = ebooksInOrder.map(item => item.book);
                    const existingLibraryIds = recipient.library.map(id => id.toString());
                    const newBookIds = bookIds.filter(id => !existingLibraryIds.includes(id.toString()));

                    if (newBookIds.length > 0) {
                        recipient.library.push(...newBookIds);
                        await recipient.save();
                    }

                    ebooksInOrder.forEach(item => {
                        item.deliveryStatus = deliveryStatus.DELIVERED;
                    });

                    const bookTitles = await Book.find({ _id: { $in: bookIds } }).select('name');
                    await sendEmail({
                        to: recipientEmail,
                        subject: 'Your E-books are Ready!',
                        text: `Your e-books: ${bookTitles.map(b => b.name).join(', ')}`
                    });
                }
            }

            // Update coupon usage
            if (order.coupon && order.coupon !== 'No Coupon') {
                await Coupon.findOneAndUpdate(
                    { code: order.coupon },
                    { $inc: { numOfUsers: 1 } }
                );
                // Coupon usage updated
            }

            await order.save();
            processedWebhooks.add(idempotencyKey);

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
                            paymentIntentId: order.transactionId,
                            paymentMethod: order.paymentMethod
                        },
                    ],
                    { session }
                );
            }

            console.log('order email: ', order.userEmail);
            // Send success email
            await sendEmail({
                to: order.userEmail,
                subject: 'Payment Successful',
                text: `Your payment for order ${order.orderNumber} was successful!`
            });

            // Redirecting to frontend...
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
            const redirectUrl = `${frontendUrl}/my-library`;
            // Redirect URL:', redirectUrl

            return res.redirect(302, redirectUrl);

        } else if (!isPending) {
            // Payment pending
            order.paymentStatus = paymentStatus.PENDING;
            await order.save();
            return res.status(200).json({ message: 'Payment pending' });

        } else {
            // Payment failed
            order.paymentStatus = paymentStatus.FAILED;
            order.orderStatus = orderStatus.CANCELLED;
            notifyOrderCancelled(order, 'Payment Failed or Canceled')

            // Restore stock
            for (const item of order.items) {
                if (item.type === itemType.PHYSICAL) {
                    await Book.updateOne(
                        { _id: item.book },
                        { $inc: { stock: item.quantity } }
                    );
                }
            }

            await order.save();
            processedWebhooks.add(idempotencyKey);

            await sendEmail({
                to: order.userEmail,
                subject: 'Payment Failed',
                text: `Payment for order ${order.orderNumber} failed.`
            });

            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
            const redirectUrl = `${frontendUrl}/order-success?orderId=${order.orderNumber}&status=failed`;
            return res.redirect(302, redirectUrl);
        }

    } catch (error) {
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('❌ WEBHOOK ERROR:', error.message);
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        return res.status(500).json({ error: 'Internal server error' });
    } finally {
        await session.endSession();
    }
};



export function cleanupProcessedWebhooks() {
    if (processedWebhooks.size > 10000) {
        processedWebhooks.clear();
    }
}