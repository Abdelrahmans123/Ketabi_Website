import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        type: {
            type: String,
            required: true,
            enum: [
                "ORDER_CONFIRMATION",
                "ORDER_SHIPPED",
                "ORDER_DELIVERED",
                "ORDER_CANCELLED",
                'ORDER_PROCESSING',
                "CART_REMINDER",
                "WISHLIST_PRICE_DROP",
                "NEW_BOOK_RELEASE",
                "REVIEW_REQUEST",
                "ACCOUNT_UPDATE",
                "PROMOTION",
                "SYSTEM_ALERT",
                "BOOK_BACK_IN_STOCK",
                "PRICE_DROP",
                "NEW_EDITION",
                "LOW_STOCK",
                'PAYMENT_SUCCESS',
                'PAYMENT_FAILED',
                'PAYMENT_REFUNDED'
            ],
            index: true,
        },
        title: {
            type: String,
            required: true,
            maxlength: 200,
        },
        content: {
            type: String,
            required: true,
            maxlength: 1000,
        },
        data: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        isRead: {
            type: Boolean,
            default: false,
            index: true,
        },
        readAt: {
            type: Date,
        },
        priority: {
            type: String,
            enum: ["low", "medium", "high", "urgent"],
            default: "medium",
        },
        actionUrl: {
            type: String,
            maxlength: 500,
        },
        expiresAt: {
            type: Date,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });

notificationSchema.virtual("timeAgo").get(function () {
    const now = new Date();
    const diff = now - this.createdAt;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    return "Just now";
});

// Method to mark notification as read
notificationSchema.methods.markAsRead = async function () {
    if (!this.isRead) {
        this.isRead = true;
        this.readAt = new Date();
        await this.save();
    }
    return this;
};

notificationSchema.methods.markAsUnread = async function () {
    if (this.isRead) {
        this.isRead = false;
        this.readAt = null;
        await this.save();
    }
    return this;
};
notificationSchema.statics.markMultipleAsRead = async function (
    notificationIds,
    userId
) {
    const result = await this.updateMany(
        {
            _id: { $in: notificationIds },
            userId: userId,
            isRead: false,
        },
        {
            $set: {
                isRead: true,
                readAt: new Date(),
            },
        }
    );
    return result;
};
notificationSchema.statics.markAllAsRead = async function (userId) {
    const result = await this.updateMany(
        { userId: userId, isRead: false },
        {
            $set: {
                isRead: true,
                readAt: new Date(),
            },
        }
    );
    return result;
};

notificationSchema.statics.getUnreadCount = async function (userId) {
    return await this.countDocuments({ userId: userId, isRead: false });
};

notificationSchema.statics.getUserNotifications = async function (
    userId,
    options = {}
) {
    const {
        page = 1,
        limit = 20,
        type = null,
        isRead = null,
        priority = null,
    } = options;

    const query = { userId };

    if (type) query.type = type;
    if (isRead !== null) query.isRead = isRead;
    if (priority) query.priority = priority;

    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
        this.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        this.countDocuments(query),
    ]);

    return {
        notifications,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    };
};
notificationSchema.statics.deleteOldNotifications = async function (
    daysOld = 30
) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.deleteMany({
        createdAt: { $lt: cutoffDate },
        isRead: true,
    });

    return result;
};

notificationSchema.pre("save", function (next) {
    if (this.isNew && !this.expiresAt) {
        const expirationDays = {
            CART_REMINDER: 30,
            PROMOTION: 7,
            SYSTEM_ALERT: 60,
        };
        const days = expirationDays[this.type];
        if (days) {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + days);
            this.expiresAt = expiryDate;
        }
    }
    next();
});

notificationSchema.set("toJSON", { virtuals: true });
notificationSchema.set("toObject", { virtuals: true });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
