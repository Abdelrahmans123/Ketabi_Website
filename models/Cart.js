import mongoose from "mongoose";
import { itemType } from "../utils/orderEnums.js";
import Book from "./Book.js";

const cartItemSchema = new mongoose.Schema({
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    quantity: { type: Number, required: true, min: 1 },
    type: { type: String, enum: Object.values(itemType), required: true, default: itemType.EBOOK }
});

const cartSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [cartItemSchema],
    totalPrice: { type: Number, min: 0 },
}, { timestamps: true });

cartSchema.pre('save', async function (next) {
    // Calculate total price & stock
    const bookIds = this.items.map(item => item.book);
    const books = await Book.find({ _id: { $in: bookIds } });

    const bookMap = new Map(books.map(book => [book._id.toString(), book]));
    this.totalPrice = 0;

    for (const item of this.items) {
        const book = bookMap.get(item.book.toString());
        
        if (!book) {
            return next(new Error(`Book with ID ${item.book} not found`));
        }

        if(item.type === itemType.PHYSICAL && book.stock < item.quantity) {
            item.quantity = book.stock || 0;
        }
        
        if(item.type === itemType.EBOOK){
            item.price = book.price * 0.45;
            item.quantity = 1;
        } else {
            item.price = book.price;
        }
    
        this.totalPrice += item.price * item.quantity * (1 - book.discount / 100);
    }
    next();
});

const Cart = mongoose.model('carts', cartSchema);
export default Cart;