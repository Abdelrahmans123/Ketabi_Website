import { sendNotification } from "../utils/sendNotification.js";
import { notificationType } from "../utils/notificationTypeEnum.js";
import asyncHandler from "../utils/asyncHandler.js";


export const notifyOrderConfirmed = async (order) => {
    const itemCount = order.items.length;
    const bookNames = order.items
        .slice(0, 3)
        .map((item) => item.book?.name || "Book")
        .join(", ");

    await sendNotification({
        userId: order.user,
        type: notificationType.ORDER_CONFIRMED,
        title: "🎉 Order Confirmed!",
        content: `Your order #${order.orderNumber} with ${itemCount} item${
            itemCount > 1 ? "s" : ""
        } has been confirmed. Total: ${order.finalPrice} EGP`,
        data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            itemCount,
            totalPrice: order.totalPrice,
            finalPrice: order.finalPrice,
            paymentMethod: order.paymentMethod,
            bookNames,
            orderStatus: order.orderStatus,
        },
    });

    console.log(
        `Order confirmed notification sent for order: ${order.orderNumber}`
    );
};


export const notifyPaymentSuccess = async (order) => {
    const itemCount = order.items.length;

    await sendNotification({
        userId: order.user,
        type: notificationType.PAYMENT_SUCCESS,
        title: "Payment Successful!",
        content: `Payment of ${order.finalPrice} EGP for order #${order.orderNumber} was successful. Your order is being processed.`,
        data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            amount: order.finalPrice,
            paymentMethod: order.paymentMethod,
            transactionId: order.transactionId,
            itemCount,
            paymentStatus: order.paymentStatus,
        },
    });
    console.log(
        `Payment success notification sent for order: ${order.orderNumber}`
    );
};


export const notifyPaymentFailed = async (order, reason = "Unknown") => {
        await sendNotification({
            userId: order.user,
            type: notificationType.PAYMENT_FAILED,
            title: "Payment Failed",
            content: `Payment for order #${order.orderNumber} failed. Reason: ${reason}. Please try again.`,
            data: {
                orderId: order._id,
                orderNumber: order.orderNumber,
                amount: order.finalPrice,
                paymentMethod: order.paymentMethod,
                failureReason: reason,
                retryUrl: `/orders/${order._id}/retry`,
            },
        });
        console.log(
            `Payment failed notification sent for order: ${order.orderNumber}`
        );
    };

export const notifyOrderProcessing = async (order) => {
    await sendNotification({
        userId: order.user,
        type: notificationType.ORDER_PROCESSING,
        title: "Order Processing",
        content: `Your order #${order.orderNumber} is being prepared for shipment.`,
        data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            orderStatus: order.orderStatus,
            estimatedDelivery: calculateEstimatedDelivery(),
        },
    });

    console.log(
        `Order processing notification sent for order: ${order.orderNumber}`
    );
};

export const notifyOrderShipped = async (order, trackingNumber = null) => {
    const hasPhysicalItems = order.items.some(
        (item) => item.type === "physical"
        );
        if (!hasPhysicalItems) {
            return;
        }
        await sendNotification({
            userId: order.user,
            type: notificationType.ORDER_SHIPPED,
            title: "🚚 Order Shipped!",
            content: `Great news! Your order #${
                order.orderNumber
            } has been shipped${
                trackingNumber ? ` (Tracking: ${trackingNumber})` : ""
            }. Expected delivery in 3-5 business days.`,
            data: {
                orderId: order._id,
                orderNumber: order.orderNumber,
                trackingNumber,
                shippingAddress: order.shippingAddress,
                estimatedDelivery: calculateEstimatedDelivery(3, 5),
                orderStatus: order.orderStatus,
            },
        });
        console.log(
            `Order shipped notification sent for order: ${order.orderNumber}`
        );
    };


export const notifyOrderDelivered = async (order) => {
    await sendNotification({
        userId: order.user,
        type: notificationType.ORDER_DELIVERED,
        title: "Order Delivered!",
        content: `Your order #${order.orderNumber} has been delivered successfully. Enjoy your books!`,
        data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            deliveredAt: new Date(),
            orderStatus: order.orderStatus,
            reviewUrl: `/orders/${order._id}/review`,
        },
    });

    console.log(
        `Order delivered notification sent for order: ${order.orderNumber}`
    );
};


export const notifyOrderCancelled = async (order, reason = "User request") => {
    await sendNotification({
            userId: order.user,
            type: notificationType.ORDER_CANCELLED,
            title: "Order Cancelled",
            content: `Your order #${
                order.orderNumber
            } has been cancelled. Reason: ${reason}${
                order.paymentStatus === "Completed"
                    ? ". Refund will be processed within 5-7 business days."
                    : ""
            }`,
            data: {
                orderId: order._id,
                orderNumber: order.orderNumber,
                cancellationReason: reason,
                refundAmount:
                    order.paymentStatus === "Completed" ? order.finalPrice : 0,
                refundStatus:
                    order.paymentStatus === "Completed" ? "Pending" : "N/A",
                orderStatus: order.orderStatus,
            },
        });

        console.log(
            `Order cancelled notification sent for order: ${order.orderNumber}`
        );
    };

export const notifyPaymentRefunded = async (order) => {
    await sendNotification({
        userId: order.user,
        type: notificationType.PAYMENT_REFUNDED,
        title: "Refund Processed",
        content: `Refund of ${order.finalPrice} EGP for order #${order.orderNumber} has been processed successfully.`,
        data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            refundAmount: order.finalPrice,
            paymentMethod: order.paymentMethod,
            refundedAt: new Date(),
            expectedCreditDays: getRefundCreditDays(order.paymentMethod),
        },
    });

    console.log(`Refund notification sent for order: ${order.orderNumber}`);
};


export const notifyGiftReceived = async (recipientUserId, order) => {
    const itemCount = order.items.length;
        const bookNames = order.items
            .slice(0, 3)
            .map((item) => item.book?.name || "Book")
            .join(", ");

        await sendNotification({
            userId: recipientUserId,
            type: notificationType.ORDER_DELIVERED,
            title: "Gift Received!",
            content: `You've received a gift with ${itemCount} book${
                itemCount > 1 ? "s" : ""
            } from ${order.userName}! ${
                order.personalizedMessage
                    ? `Message: "${order.personalizedMessage}"`
                    : ""
            }`,
            data: {
                orderId: order._id,
                orderNumber: order.orderNumber,
                from: order.userName,
                fromEmail: order.userEmail,
                itemCount,
                bookNames,
                personalizedMessage: order.personalizedMessage,
                isGift: true,
            },
        });

        console.log(
            `Gift received notification sent for order: ${order.orderNumber}`
        );
    };


function calculateEstimatedDelivery(minDays = 3, maxDays = 5) {
    const today = new Date();
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + minDays);
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + maxDays);

    return {
        min: minDate.toISOString(),
        max: maxDate.toISOString(),
        text: `${minDate.toLocaleDateString()} - ${maxDate.toLocaleDateString()}`,
    };
}

function getRefundCreditDays(paymentMethod) {
    const refundDays = {
        Stripe: 5,
        PayPal: 3,
        "Cash on Delivery": 0,
        Paymob: 7,
    };
    return refundDays[paymentMethod] || 5;
}
