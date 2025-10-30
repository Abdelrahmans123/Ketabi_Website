import mongoose from "mongoose";

const BookSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        author: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        Edition: {
            type: String,
            required: true,
        },
        categoryName: {
            type: String,
            required: true,
            trim: true,
        },
        price: {
            type: Number,
            required: true,
        },
        discount: {
            type: Number,
        },
        cost: {
            type: Number,
            required: true,
        },
        stock: {
            type: Number,
        },
        noOfPages: {
            type: Number,
            required: true,
        },
        image: {
            url: String,
        },
        status: {
            type: String,
            enum: ["in stock", "out of stock", "removed"],
            default: "in stock",
        },
        pdf: {
            key: { type: String },
            url: { type: String },
            fileName: { type: String },
            size: { type: Number },
            mimeType: { type: String },
            uploadedAt: { type: Date },
        },
        avgRating: {
            type: Number,
            default: 0
        },
        ratingsCount: {
            type: Number,
            default: 0
        },
        publisher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        }
    },
    { timestamps: true }
);

BookSchema.virtual("finalPrice").get(function () {
    return this.price - (this.price * (this.discount || 0)) / 100;
});

const Book = mongoose.model("Book", BookSchema);
export default Book;
