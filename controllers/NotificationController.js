import Notification from "../models/Notification.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import {
    deleteMany,
    findOne,
    findOneAndDelete,
    remove,
} from "../models/services/db.js";

export const getUserNotifications = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { page = 1, limit = 20, type, isRead, priority } = req.query;

    const result = await Notification.getUserNotifications(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        type,
        isRead: isRead !== undefined ? isRead === "true" : null,
        priority,
    });

    res.status(200).json({
        success: true,
        ...result,
    });
});

export const getUnreadCount = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const count = await Notification.getUnreadCount(userId);

    res.status(200).json({
        success: true,
        count,
    });
});

export const markAsRead = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await findOne({
        model: Notification,
        query: { _id: id, userId },
    });

    if (!notification) {
        throw new AppError("Notification not found", 404);
    }

    await notification.markAsRead();

    res.status(200).json({
        success: true,
        message: "Notification marked as read",
        notification,
    });
});

export const markMultipleAsRead = asyncHandler(async (req, res) => {
    const { notificationIds } = req.body;
    const userId = req.user._id;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        throw new AppError("Invalid notification IDs", 400);
    }

    const result = await Notification.markMultipleAsRead(
        notificationIds,
        userId
    );

    res.status(200).json({
        success: true,
        message: "Notifications marked as read",
        modifiedCount: result.modifiedCount,
    });
});

export const markAllAsRead = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const result = await Notification.markAllAsRead(userId);

    res.status(200).json({
        success: true,
        message: "All notifications marked as read",
        modifiedCount: result.modifiedCount,
    });
});

export const deleteNotification = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await remove({
        model: Notification,
        query: { _id: id, userId },
    });

    if (!notification) {
        throw new AppError("Notification not found", 404);
    }

    res.status(200).json({
        success: true,
        message: "Notification deleted successfully",
    });
});

export const deleteAllRead = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const result = await deleteMany({
        model: Notification,
        filter: { userId, isRead: true },
    });

    res.status(200).json({
        success: true,
        message: "All read notifications deleted",
        deletedCount: result.deletedCount,
    });
});

export const getNotificationById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await findOne({
        model: Notification,
        query: { _id: id, userId },
    });

    if (!notification) {
        throw new AppError("Notification not found", 404);
    }
    if (!notification.isRead) {
        await notification.markAsRead();
    }
    res.status(200).json({
        success: true,
        notification,
    });
});
