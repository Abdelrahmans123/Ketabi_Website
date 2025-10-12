import mongoose from "mongoose";
import { itemType } from "../utils/orderEnums";

const books = mongoose.model('books');

const cartItemSchema = new mongoose.Schema({
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'books', required: true },
    bookTitle: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    type: { type: String, enum: Object.values(itemType), required: true, default: itemType.EBOOK },
    price: { type: Number, required: true, min: 0 },
});

const cartSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true, unique: true },
    items: [cartItemSchema],
    totalPrice: { type: Number, min: 0 },
}, { timestamps: true });

// Index for user lookup
cartSchema.index({ user: 1 });

cartSchema.pre('save', async function (next) {
    // Calculate total price
    const bookIds = this.items.map(item => item.book);
    const books = await books.find({ _id: { $in: bookIds } });

    const bookMap = new Map(books.map(book => [book._id.toString(), book]));

    for (const item of this.items) {
        const book = bookMap.get(item.book.toString());
        if (!book) {
            return next(new Error(`Book with ID ${item.book} not found`));
        }
        if(item.type === itemType.PHYSICAL && book.stock < item.quantity) {
            return next(new Error(`Insufficient stock for book ${book.title}`));
        }
        if(item.type === itemType.EBOOK){
            item.price = book.price * 0.45;
        } else {
            item.price = book.price;
        }
    }
    next();
});

module.exports = mongoose.model('carts', cartSchema);