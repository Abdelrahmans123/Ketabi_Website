import mongoose from "mongoose";
import { paymentStatus, orderStatus, paymentMethods, itemType, deliveryStatus } from "../utils/orderEnums.js";
import Coupon from "./Coupon.js";
import Book from "./Book.js";
import User from "./User.js";

const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
});

const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userEmail: { type: String, required: true },
    userName: { type: String, required: true },
    orderNumber: { type: String, unique: true },
    items: [
        {
            book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
            quantity: { type: Number, required: true, min: 1 },
            price: { type: Number, required: true, min: 0 },
            type: { type: String, enum: Object.values(itemType), required: true },
            discount: { type: Number, required: true, min: 0, max: 100 },
            publisher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            deliveryStatus: { type: String, enum: Object.values(deliveryStatus), default: deliveryStatus.PENDING },
            paymentStatus: {
                type: String,
                enum: Object.values(paymentStatus),
                default: paymentStatus.PENDING,
            }
        },
    ],
    totalPrice: { type: Number, min: 0, required: true },
    coupon: { type: String },
    discountApplied: { type: Number, min: 0, max: 100 },
    finalPrice: { type: Number, min: 0, required: true, min: 0 },
    orderStatus: {
        type: String,
        enum: Object.values(orderStatus),
        default: orderStatus.PENDING,
    },
    paymentStatus: {
        type: String,
        enum: Object.values(paymentStatus),
        default: paymentStatus.PENDING,
    },
    shippingAddress: {
        street: { type: String },
        city: { type: String },
        phoneNumber: { type: String },
    },
    transactionId: { type: String },
    paymentMethod: { type: String, required: true, enum: Object.values(paymentMethods) },
    isGift: { type: Boolean, default: false },
    recipientEmail: { type: String, default: null },
    personalizedMessage: { type: String },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 1 * 60 * 1000) 
    },
}, { timestamps: true });


// Indexes
orderSchema.index({ createdAt: -1 });
orderSchema.index({ user: 1 });
orderSchema.index({ userEmail: 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ expiresAt: 1 })

const Counter = mongoose.model('Counter', counterSchema);

// Pre-save hooks
orderSchema.pre('save', async function (next) {
    // Generate order number
    if (!this.orderNumber || this.orderNumber === '') {
        try {
            const counter = await Counter.findOneAndUpdate(
                { _id: 'orderNumber' },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            this.orderNumber = `${counter.seq}${Date.now().toString().slice(-6)}`;
            console.log('Generated order number:', this.orderNumber);
        } catch (error) {
            console.error('Error generating order number:', error);
            return next(new Error('Failed to generate order number: ' + error.message));
        }
    }
    next();
});

const Order = mongoose.model('orders', orderSchema);

export { Order };