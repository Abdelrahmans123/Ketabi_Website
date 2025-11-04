import mongoose from "mongoose";
import { paymentMethods, paymentStatus, refundStatus } from "../utils/orderEnums.js";

const refundRequestSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    paymentIntentId: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      enum: [
        "EXPIRED_ORDER",
        "CUSTOMER_REQUEST",
        "FAILED_DELIVERY",
        "OTHER",
      ],
      default: "EXPIRED_ORDER",
    },
    status: {
      type: String,
      enum: Object.values(refundStatus),
      default: refundStatus.PENDING,
    },
    amount: {
      type: Number,
      required: true,
    },
    notes: {
      type: String,
      default: "",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    paymentMethod: {
      type: String,
      enum: Object.values(paymentMethods),
      required: true,
    }
  },
  { timestamps: true }
);

const RefundRequest = mongoose.model("RefundRequest", refundRequestSchema);

export default RefundRequest;