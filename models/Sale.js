import mongoose from "mongoose";

const saleItemSchema = new mongoose.Schema({
  book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  type: { type: String, enum: ["ebook", "physical"], required: true },
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
    paymentIntentId: { type: String },
    createdAt: { type: Date, default: Date.now },
    coupon: { type: String, default: "No Coupon" },              
    couponDiscount: { type: Number, default: 0 },          
  },
  { timestamps: true }
);

export default mongoose.model("Sale", saleSchema);
