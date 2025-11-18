import mongoose from "mongoose";
import { itemType, paymentMethods } from "../utils/orderEnums.js";

const saleItemSchema = new mongoose.Schema({
  book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  type: { type: String, enum: Object.values(itemType), required: true },
  total: { type: Number, required: true },
});

const saleSchema = new mongoose.Schema(
  {
    publisher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    items: [saleItemSchema],
    totalAmount: { type: Number, required: true },
    finalPrice: {type: Number, required: true, min:0},
    paymentIntentId: { type: String },
    createdAt: { type: Date, default: Date.now },
    coupon: { type: String, default: "No Coupon" },              
    couponDiscount: { type: Number, default: 0 },
    paymentMethod: {type: String, enum: Object.values(paymentMethods)}          
  },
  { timestamps: true }
);

const Sale = mongoose.model('Sale', saleSchema);

export default Sale;
