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
    totalPrice: { type: Number, min: 0, required: true, min: 0 },
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
        postalCode: { type: String },
        country: { type: String },
        phoneNumber: { type: String },
    },
    transactionId: { type: String },
    paymentMethod: { type: String, required: true, enum: Object.values(paymentMethods) },
    isGift: { type: Boolean, default: false },
    recipientEmail: { type: String, default: null },
    personalizedMessage: { type: String },
}, { timestamps: true });


// Indexes
orderSchema.index({ createdAt: -1 });
orderSchema.index({ user: 1 });
orderSchema.index({ userEmail: 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });

const Counter = mongoose.model('Counter', counterSchema);

// Pre-save hooks
orderSchema.pre('save', async function (next) {
    console.log('order number: ', this.orderNumber);
    // Generate order number if not present
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
            console.error('Error generating order number:', err);
            return next(new Error('Failed to generate order number: ' + err.message));
        }
    }

    // Validate Shipping Address for Physical Books
    const hasPhysicalBook = this.items.some(item => item.type === itemType.PHYSICAL);
    if (hasPhysicalBook && (!this.shippingAddress || !this.shippingAddress.street || !this.shippingAddress.city || !this.shippingAddress.postalCode || !this.shippingAddress.country)) {
        return next(new Error('Shipping address is required for physical book orders'));
    }

    // Calculate prices
    this.totalPrice = Math.round(this.items.reduce((sum, item) => sum + item.price * item.quantity * (1 - item.discount / 100), 0) * 100) / 100;
    this.finalPrice = Math.round((this.totalPrice - (this.discountApplied / 100 * this.totalPrice)) * 100) / 100;
    if (this.finalPrice < 0) {
        return next(new Error('Final price cannot be negative'));
    }

    // Validate stock for physical books
    for (const item of this.items) {
        if (item.type === itemType.PHYSICAL) {
            const book = await Book.findById(item.book);
            if (!book || book.stock < item.quantity) {
                return next(new Error(`Insufficient stock for book ${item.bookTitle}`));
            }
        }
    }

    next();
});

const Order = mongoose.model('orders', orderSchema);

export { Order };