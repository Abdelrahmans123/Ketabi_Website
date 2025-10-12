import mongoose from "mongoose";
import { paymentStatus, orderStatus, paymentMethods, itemType, deliveryStatus } from "../utils/orderEnums";

const count = await mongoose.model('orders').countDocuments();
const coupons = mongoose.model('coupons');
const books = mongoose.model('books');

const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    userEmail: { type: String, required: true },
    orderNumber: { type: String, unique: true, required: true },
    items: [
        {
            book: { type: mongoose.Schema.Types.ObjectId, ref: 'books', required: true },
            bookTitle: { type: String, required: true },
            quantity: { type: Number, required: true, min: 1 },
            price: { type: Number, required: true, min: 0 },
            type: { type: String, enum: Object.values(itemType), required: true },
        },
    ],
    totalPrice: { type: Number, min: 0, required: true, min: 0 },
    discountApplied: {
        coupon: { type: String },
        discountPercentage: { type: Number, default: 0 },
    },
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
    deliveryStatus: {
        type: String,
        enum: Object.values(deliveryStatus),
        default: deliveryStatus.NOT_SHIPPED,
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
orderSchema.index({ user: 1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ createdAt: -1 });

// Pre-save hooks
orderSchema.pre('save', async function (next) {

    // Generate order number if not present
    if (!this.orderNumber) {
        this.orderNumber = `ORD-${count + 1}-${Date.now().toString().slice(-6)}`;
    }

    // Get the discount percentage if coupon is applied
    if (this.discountApplied && this.discountApplied.coupon) {
        const discountPercentage = await coupons.findOne({code: this.discountApplied.coupon}).select('discountPercentage -_id');
        if (discountPercentage) {
            this.discountApplied.discountPercentage = discountPercentage.discountPercentage;
        } else {
            this.discountApplied.discountPercentage = 0;
        }
    }

    // Validate Shipping Address for Physical Books
    const hasPhysicalBook = this.items.some(item => item.type === itemType.PHYSICAL);
    if (hasPhysicalBook && (!this.shippingAddress || !this.shippingAddress.street || !this.shippingAddress.city || !this.shippingAddress.postalCode || !this.shippingAddress.country)) {
        return next(new Error('Shipping address is required for physical book orders'));
    }

    // Calculate prices
    this.totalPrice = Math.round(this.items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100;
    this.finalPrice = Math.round((this.totalPrice - (this.discountApplied.discountPercentage / 100 * this.totalPrice)) * 100) / 100;
    if (this.finalPrice < 0) {
        return next(new Error('Final price cannot be negative'));
    }

    // Validate stock for physical books
    for (const item of this.items) {
        if(item.type === itemType.PHYSICAL) {
            const book = await books.findById(item.book);
            if (!book || book.stock < item.quantity) {
                return next(new Error(`Insufficient stock for book ${item.bookTitle}`));
            }
        }
    }

    next();
});

module.exports = mongoose.model('orders', orderSchema);