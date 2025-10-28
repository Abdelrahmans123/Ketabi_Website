import cron from "node-cron";
import Coupon from "../models/Coupon.js";
import User from "../models/User.js";
import { sendEmail } from "./../utils/sendEmail.js";
import Cart from "../models/Cart.js";
import asyncHandler from "../utils/asyncHandler.js";

export const couponExpirationJob = () => {
  cron.schedule(
    "0 0 * * *",
    asyncHandler(async () => {
      const now = new Date();
      const result = await Coupon.updateMany(
        { expiryDate: { $lt: now }, isActive: true },
        { isActive: false }
      );
      console.log(
        `Expired coupons deactivated: ${result.modifiedCount} coupons updated`
      );
    })
  );
};

export const deleteUnconfirmedUsersJob = () => {
  cron.schedule(
    "0 2 * * *",
    asyncHandler(async () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const result = await User.deleteMany({
        isEmailConfirmed: false,
        createdAt: { $lt: threeDaysAgo },
      });
      console.log(
        ` Deleted ${result.deletedCount} unconfirmed users older than 3 days.`
      );
    })
  );
};

export const inactiveUserReminderJob = () => {
  cron.schedule(
    "0 10 * * *",
    asyncHandler(async () => {
      const inactiveSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const users = await User.find({
        lastLoginAt: { $lt: inactiveSince },
      });

      if (users.length === 0) {
        console.log(" No inactive users found today.");
        return;
      }

      for (const user of users) {
        await sendEmail({
          to: user.email,
          subject: "Discover New Deals on Ketabi 📚",
          text: `
          Hi ${user.name || "book lover"} 👋
          
          It's been a while since your last visit to Ketabi!
          Check out the latest books and exclusive discounts this week 🔥
          
          Visit us now and find your next favorite read ❤️
          https://ketabi.com
          `,
        });
      }
      console.log(` Sent reminder to ${users.length} inactive users`);
    })
  );
};

export const cleanupOldCartsJob = () => {
  cron.schedule(
    "0 2 * * *",
    asyncHandler(async () => {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = await Cart.deleteMany({ updatedAt: { $lt: cutoff } });
      console.log(
        `Deleted ${result.deletedCount} old carts older than 30 days`
      );
    })
  );
};

export const orderCleanupJob = () => {
  cron.schedule(
    "*/5 * * * *",
    asyncHandler(async () => {
      const now = new Date();
      const expiredOrders = await Order.find({
        paymentStatus: paymentStatus.PENDING,
        expiresAt: { $lt: now },
      });

      if (expiredOrders.length === 0) {
        console.log("🕒 No expired orders found at this time.");
        return;
      }

      console.log(`⚠️ Found ${expiredOrders.length} expired orders — restoring stock...`);

      for (const order of expiredOrders) {
        for (const item of order.items) {
          if (item.type === itemType.PHYSICAL) {
            await Book.updateOne(
              { _id: item.book },
              { $inc: { stock: item.quantity } }
            );
          }
        }

        order.paymentStatus = paymentStatus.EXPIRED;
        await order.save();
        console.log(`✅ Order ${order.orderNumber} marked as expired & stock restored.`);
      }
    })
  );
};