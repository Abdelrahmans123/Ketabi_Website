import { findAll } from "../models/services/db.js";
import asyncHandler from "../utils/asyncHandler.js";
import Ticket from "../models/Ticket.js";
import AppError from "../utils/AppError.js";
import { successResponse } from "../utils/successResponse.js";
export const getAllTickets = asyncHandler(async (req, res, next) => {
    const tickets = await findAll({model: Ticket});
    if (!tickets) {
        const error = new AppError("No tickets found", 404);
        return next(error);
    }
    return successResponse({
        res,
        statusCode: 200,
        message: "Tickets fetched successfully",
        data: tickets,
    });
});
