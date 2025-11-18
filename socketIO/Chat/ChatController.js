import { findOne } from "../../models/services/db.js";
import Ticket from "../../models/Ticket.js";
import {
    initCartReminderCleanup,
    initCartReminderScheduler,
} from "../../services/CartReminder.js";
import AppError from "../../utils/AppError.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { sendMessage, registerEvents, handleTyping } from "./events.js";

export const registerSocket = (socket, io) => {
    registerEvents(socket);
    sendMessage(socket, io);
    handleTyping(socket, io);
    initCartReminderScheduler();
    initCartReminderCleanup();
};
export const getChat = asyncHandler(async (req, res, next) => {
    const userId = req.params.id;
    const chat = await findOne(Ticket, {
        users: { $all: [req.user.id, userId] },
    });
    if (!chat) {
        const error = new AppError("No chat found", 404);
        return next(error);
    }
    return successResponse({
        res,
        statusCode: 200,
        message: "Chat fetched successfully",
        data: chat,
    });
});
