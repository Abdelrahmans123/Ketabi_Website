import mongoose from "mongoose";
import { deliveryStatus, itemType, paymentStatus } from "../utils/orderEnums.js";

const publisherOrderSchema = new mongoose.Schema({
  publisher: { type: mongoose.Schema.Types.ObjectId, ref: "Publisher", required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
  email: {type: String, required: true},
  name: {type: String, required: true},
  items: [
    {
      book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
      quantity: { type: Number, required: true, min: 0 },
      price: { type: Number },
      discount: { type: Number, min: 0, max: 100 },
      type: { type: String, enum: Object.values(itemType) },
      deliveryStatus: { type: String, enum: Object.values(deliveryStatus), default: deliveryStatus.PROCESSING },
      paymentStatus: { type: String, enum: Object.values(paymentStatus), default: paymentStatus.COMPLETED },
    }
  ],
  coupon: { type: String, default: "No Coupon" },
  couponDiscount: { type: Number, default: 0, min: 0, max: 100 },
  totalPrice: { type: Number, min: 0 },
  shippingAddress: {
    street: { type: String },
    city: { type: String },
    postalCode: { type: String },
    country: { type: String },
    phoneNumber: { type: String },
  },
  finalPrice: {type: Number, min:0}
}, { timestamps: true });

publisherOrderSchema.index({ publisher: 1 })
publisherOrderSchema.index({ order: 1 })


const PublisherOrder = mongoose.model('PublisherOrder', publisherOrderSchema);

export default PublisherOrder;