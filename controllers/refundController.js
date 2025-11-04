import RefundRequest from "../models/refundRequests.js";
import {Order} from "../models/Order.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sendEmail } from "../utils/sendEmail.js";
import Stripe from "stripe";
import { refundStatus } from "../utils/orderEnums.js";
import User from "../models/User.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

//List all refund requests
 
export const getRefunds = asyncHandler(async (req, res) => {
    const { status = refundStatus.PENDING, page = 1, limit = 10 } = req.query;
    const query = status === "ALL" ? {} : { status };

    const refunds = await RefundRequest.find(query)
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

    const refund = await RefundRequest.findById(id);

    if (!refund) return next(new AppError("Refund request not found", 404));

    if (refund.status !== refundStatus.PENDING)
        return next(new AppError("Refund request already processed", 400));

    if (action === refundStatus.REFUNDED)
        return next(new AppError("Can't refund from this route", 400));

    refund.status = action;

    const user = await User.findById(refund.user);
    const order = await Order.findById(refund.order);

    refund.notes = notes || "";
    refund.reviewedAt = new Date();
    refund.reviewedBy = req.user._id;
    await refund.save();

    await sendEmail({
        to: user.email,
        subject: `Refund Request ${refund.status}`,
        text: `Your refund request for Order #${order.orderNumber} has been ${refund.status.toLowerCase()} by our support team.`,
    });

    res.status(200).json({ message: `Refund ${refund.status}`, refund });
});

// Stripe refund for approved requests
export const processRefund = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    
    const refundReq = await RefundRequest.findById(id);
    const user = await User.findById(refundReq.user);
    const order = await Order.findById(refundReq.order);

    if (!refundReq) return next(new AppError("Refund request not found", 404));
    if (refundReq.status !== refundStatus.APPROVED)
        return next(new AppError("Refund must be approved before processing", 400));

    try {
        const refund = await stripe.refunds.create({
            payment_intent: refundReq.paymentIntentId,
            amount: Math.round(refundReq.amount * 100),
        });

        refundReq.status = refundStatus.REFUNDED;
        refundReq.reviewedAt = new Date();
        await refundReq.save();

        await sendEmail({
            to: user.email,
            subject: "Refund Completed",
            text: `
Hi ${user.name},

Your refund for Order #${order.orderNumber} has been successfully processed.

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