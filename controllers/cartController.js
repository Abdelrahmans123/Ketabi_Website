import { mongoose } from "mongoose";
import { carts } from "../models/Cart.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { successResponse } from "../utils/successResponse.js";
import { itemType } from "../utils/orderEnums";

const books = mongoose.model('books');

function errorhandler(message, statusCode) {
    return (AppError.create(message, statusCode));
    
}

export const getCart = asyncHandler(async (req, res, next) => {
    const cart = await carts.findOne({ user: req.user._id }).populate('items.book');
    if (!cart) {
        return next(errorhandler("Cart not found", 404));
    }
    return successResponse({
        res,
        statusCode: 200,
        message: "Cart retrieved successfully",
        data: cart
    })
});

export const addTocart = asyncHandler(async (req, res, next) => {
    const { book, name, quantity, type, price } = req.body;
    let cart = await carts.findOne({ user: req.user._id });
    const bookDoc = await books.findById(book);
    if (!bookDoc) {
        return next(errorhandler("Book not found", 404));
    }
    if (type === itemType.PHYSICAL && quantity > bookDoc.stock) {
        return next(errorhandler("Not enough Stock", 400));
    }
    if (!cart) {
        cart = new carts({
            user: req.user._id,
            items: [{ book, bookTitle: name, quantity, type, price: type === itemType.EBOOK ? bookDoc.price * 0.45 : bookDoc.price }],
            totalPrice: quantity * (type === itemType.EBOOK ? bookDoc.price * 0.45 : bookDoc.price)
        }, { timestamps: true });
    } else {
        const itemIndex = cart.items.findIndex(item => item.book === book);
        if (itemIndex > -1) {
            cart.items[itemIndex].quantity += quantity;
        } else {
            cart.items.push({ book, bookTitle: name, quantity, type, price: type === itemType.EBOOK ? bookDoc.price * 0.45 : bookDoc.price });
        }
    }
    await cart.save();
    return successResponse({
        res,
        statusCode: 200,
        message: "Item added to cart successfully",
        data: cart
    });
});

export const updateCart = asyncHandler(async (req, res, next) => {
    const { book } = req.params;
    const { quantity } = req.body;
    let cart = await carts.findOne({ user: req.user._id });
    if (!cart) {
        return next(errorhandler("Cart not found", 404));
    }
    const itemIndex = cart.items.findIndex(item => item.book === book);
    if (itemIndex === -1) {
        return next(errorhandler("Book not found in cart", 404));
    }
    const bookDoc = await books.findById(book);
    if (!bookDoc) {
        return next(errorhandler("Book not found", 404));
    }
    if (cart.items[itemIndex].type === itemType.PHYSICAL && quantity > bookDoc.stock) {
        return next(errorhandler(`Not enough Stock for ${bookDoc.bookTitle}`, 400));
    }
    cart.items[itemIndex].quantity = quantity;
    await cart.save();
    return successResponse({
        res,
        statusCode: 200,
        message: "Cart updated successfully",
        data: cart
    });  
});

export const removeFromCart = asyncHandler(async (req, res, next) => {
    const { book } = req.params;
    let cart = await carts.findOne({ user: req.user._id });
    if (!cart) {
        return next(errorhandler("Cart not found", 404));
    }
    const itemIndex = cart.items.findIndex(item => item.book === book);
    if (itemIndex === -1) {
        return next(errorhandler("Book not found in cart", 404));
    }
    cart.items = cart.items.filter(item => item.book !== book);
    await cart.save();
    return successResponse({
        res,
        statusCode: 200,
        message: "Book removed successfully",
        data: cart
    });  
});