import cron from "node-cron";
import Cart from "../models/Cart.js";
import { sendNotification } from "../utils/sendNotification.js";
import { notificationType } from "../utils/notificationTypeEnum.js";
import asyncHandler from "../utils/asyncHandler.js";
import { deleteMany, findAll, findOne } from "../models/services/db.js";
import AppError from "../utils/AppError.js";

// Configuration
const CART_REMINDER_INTERVALS = {
    FIRST_REMINDER: 24 * 60 * 60 * 1000, // 24 hours
    SECOND_REMINDER: 72 * 60 * 60 * 1000, // 72 hours (3 days)
    FINAL_REMINDER: 168 * 60 * 60 * 1000, // 168 hours (7 days)
};

export const checkAbandonedCarts = asyncHandler(async () => {
    const now = new Date();
    const carts = await findAll({
        model: Cart,
        query: { items: { $exists: true, $not: { $size: 0 } } },
        populate: "user",
    });
    for (const cart of carts) {
        if (!cart.user) continue;
        const timeSinceUpdate = now - cart.updatedAt;
        const userId = cart.user._id.toString();
        let shouldSendReminder = false;
        let reminderType = "";
        if (timeSinceUpdate >= CART_REMINDER_INTERVALS.FINAL_REMINDER) {
            const lastReminder = await getLastCartReminder(userId, "FINAL");
            if (
                !lastReminder ||
                now - lastReminder.createdAt >
                    CART_REMINDER_INTERVALS.FINAL_REMINDER
            ) {
                shouldSendReminder = true;
                reminderType = "FINAL";
            }
        } else if (timeSinceUpdate >= CART_REMINDER_INTERVALS.SECOND_REMINDER) {
            const lastReminder = await getLastCartReminder(userId, "SECOND");
            if (
                !lastReminder ||
                now - lastReminder.createdAt >
                    CART_REMINDER_INTERVALS.SECOND_REMINDER
            ) {
                shouldSendReminder = true;
                reminderType = "SECOND";
            }
        } else if (timeSinceUpdate >= CART_REMINDER_INTERVALS.FIRST_REMINDER) {
            const lastReminder = await getLastCartReminder(userId, "FIRST");
            if (
                !lastReminder ||
                now - lastReminder.createdAt >
                    CART_REMINDER_INTERVALS.FIRST_REMINDER
            ) {
                shouldSendReminder = true;
                reminderType = "FIRST";
            }
        }
        if (shouldSendReminder) {
            await sendCartReminder(cart, reminderType);
        }
    }
    console.log(`Cart reminder check completed at ${now.toISOString()}`);
});
const sendCartReminder = asyncHandler(async (cart, reminderType) => {
    const itemCount = cart.items.length;
    const bookTitles = cart.items
        .slice(0, 3)
        .map((item) => item.book?.title)
        .filter(Boolean);

    let title, content;

    switch (reminderType) {
        case "FIRST":
            title = "You left books in your cart!";
            content = `Don't forget about ${itemCount} book${
                itemCount > 1 ? "s" : ""
            } waiting in your cart.`;
            break;
        case "SECOND":
            title = "Your cart is still waiting!";
            content = `${itemCount} book${
                itemCount > 1 ? "s are" : " is"
            } still in your cart. Complete your purchase before they're gone!`;
            break;
        case "FINAL":
            title = "Last chance to checkout!";
            content = `Your cart with ${itemCount} book${
                itemCount > 1 ? "s" : ""
            } will expire soon. Don't miss out!`;
            break;
        default:
            title = "Cart Reminder";
            content = `You have ${itemCount} item${
                itemCount > 1 ? "s" : ""
            } in your cart.`;
    }

    await sendNotification({
        userId: cart.user._id,
        type: notificationType.CART_REMINDER || "CART_REMINDER",
        title,
        content,
        data: {
            cartId: cart._id,
            itemCount,
            totalPrice: cart.totalPrice,
            bookTitles,
            reminderType,
        },
    });
});

const getLastCartReminder = async (userId, reminderType) => {
    const Notification = (await import("../models/Notification.js")).default;

    return await findOne({
        model: Notification,
        query: {
            userId,
            type: notificationType.CART_REMINDER || "CART_REMINDER",
            "data.reminderType": reminderType,
        },
        sort: { createdAt: -1 },
    });
};

export const initCartReminderScheduler = () => {
    cron.schedule("0 */6 * * *", () => {
        console.log("Running cart reminder check...");
        checkAbandonedCarts();
    });
    console.log("Cart reminder scheduler initialized");
};

export const triggerCartReminder = async (userId) => {
    try {
        const cart = await Cart.findOne({ user: userId })
            .populate("user", "email username")
            .populate("items.book", "title price coverImage");

        if (!cart || cart.items.length === 0) {
            throw new AppError("Cart is empty or not found", 404);
        }
        await sendCartReminder(cart, "FIRST");
        return { success: true, message: "Cart reminder sent" };
    } catch (error) {
        console.error("Error triggering cart reminder:", error);
        throw error;
    }
};
export const initCartReminderCleanup = () => {
    cron.schedule("0 0 * * *", async () => {
        try {
            const Notification = (await import("../models/Notification.js"))
                .default;
            const thirtyDaysAgo = new Date(
                Date.now() - 30 * 24 * 60 * 60 * 1000
            );
            const result = await deleteMany({
                model: Notification,
                query: {
                    type: notificationType.CART_REMINDER || "CART_REMINDER",
                    createdAt: { $lt: thirtyDaysAgo },
                },
            });
            console.log(
                `Cleaned up ${result.deletedCount} old cart reminder notifications`
            );
        } catch (error) {
            console.error("Error cleaning up cart reminders:", error);
        }
    });
};

export const CART_REMINDER_CONFIG = CART_REMINDER_INTERVALS;
