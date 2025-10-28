import RefundRequest from "../models/refundRequests.js";
import {Order} from "../models/Order.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sendEmail } from "../utils/sendEmail.js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

//List all refund requests
 
export const getRefunds = asyncHandler(async (req, res) => {
    const { status = "PENDING", page = 1, limit = 10 } = req.query;
    const query = status === "ALL" ? {} : { status };

    const refunds = await RefundRequest.find(query)
        .populate("order", "orderNumber finalPrice userEmail")
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await RefundRequest.countDocuments(query);

    res.status(200).json({
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
        data: refunds,
    });
});

// Approve or reject a refund request
 
export const updateRefundStatus = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { action, notes } = req.body;

    const refund = await RefundRequest.findById(id).populate("user order");
    if (!refund) return next(new AppError("Refund request not found", 404));

    if (refund.status !== "PENDING")
        return next(new AppError("Refund request already processed", 400));

    if (action === "APPROVE") {
        refund.status = "APPROVED";
    } else if (action === "REJECT") {
        refund.status = "REJECTED";
    } else {
        return next(new AppError("Invalid action. Must be APPROVE or REJECT", 400));
    }

    refund.notes = notes || "";
    refund.reviewedAt = new Date();
    refund.reviewedBy = req.user._id;
    await refund.save();

    await sendEmail({
        to: refund.user.email,
        subject: `Refund Request ${refund.status}`,
        text: `Your refund request for Order #${refund.order.orderNumber} has been ${refund.status.toLowerCase()} by our support team.`,
    });

    res.status(200).json({ message: `Refund ${refund.status}`, refund });
});

// Stripe refund for approved requests
export const processRefund = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const refundReq = await RefundRequest.findById(id).populate("order user");

    if (!refundReq) return next(new AppError("Refund request not found", 404));
    if (refundReq.status !== "APPROVED")
        return next(new AppError("Refund must be approved before processing", 400));

    try {
        const refund = await stripe.refunds.create({
            payment_intent: refundReq.paymentIntentId,
            amount: Math.round(refundReq.amount * 100),
        });

        refundReq.status = "REFUNDED";
        refundReq.reviewedAt = new Date();
        await refundReq.save();

        await sendEmail({
            to: refundReq.user.email,
            subject: "Refund Completed",
            text: `
Hi ${refundReq.user.name},

Your refund for Order #${refundReq.order.orderNumber} has been successfully processed.

Amount: ${refundReq.amount} EGP
Refund ID: ${refund.id}

- The Ketabi Team
`,
        });

        res.status(200).json({ message: "Refund processed successfully", refund });
    } catch (err) {
        return next(new AppError(`Stripe refund failed: ${err.message}`, 400));
    }
});

