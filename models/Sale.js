import mongoose from "mongoose";

const saleSchema = new mongoose.Schema(
    {
        publisher: { type: mongoose.Schema.Types.ObjectId, ref: "Publisher", required: true },
        publisherOrder: { type: mongoose.Schema.Types.ObjectId, ref: "PublisherOrder", required: true },
        order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
        items: [
            {
                book: { type: mongoose.Schema.Types.ObjectId, ref: "Book" },
                quantity: Number,
                price: Number,
                discount: Number,
                type: String,
                total: Number,
            },
        ],
        totalAmount: { type: Number, required: true },
        date: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

const Sale = mongoose.model("Sale", saleSchema);
export default Sale;
