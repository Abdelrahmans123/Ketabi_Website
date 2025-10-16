import { mongoose } from "mongoose";
import Cart from "../models/Cart.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { successResponse } from "../utils/successResponse.js";
import { itemType } from "../utils/orderEnums.js";
import { create } from "../models/services/db.js";
import Book from "../models/Book.js";



function errorhandler(message, statusCode) {
    return (AppError.create(message, statusCode));

}

export const getCart = asyncHandler(async (req, res, next) => {
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.book');
    if (!cart) {
        // if cart not found, create a new cart
        const cart = new Cart({ user: req.user._id, items: [], totalPrice: 0 });
        try {
            await create(Cart, cart);
        } catch (error) {
            return next(errorhandler(`Failed to create a new cart, Error: ${error}`, 500));
        }
        return successResponse({
            res,
            statusCode: 200,
            message: "New cart was created and retrieved successfully",
            data: cart
        })
    }
    return successResponse({
        res,
        statusCode: 200,
        message: "Cart retrieved successfully",
        data: cart
    })
});

export const addTocart = asyncHandler(async (req, res, next) => {
    const { book, quantity, type } = req.body;
    let cart = await Cart.findOne({ user: req.user._id });
    const bookDoc = await Book.findById(book);
    if (!bookDoc) {
        return next(errorhandler("Book not found", 404));
    }
    if (type === itemType.PHYSICAL && quantity > bookDoc.stock) {
        return next(errorhandler("Not enough Stock", 400));
    }
    if (!cart) {
        cart = new Cart({
            user: req.user._id,
            items: [{ book: bookDoc._id, bookTitle: bookDoc.name, quantity, type, price: type === itemType.EBOOK ? bookDoc.price * 0.45 : bookDoc.price }],
            totalPrice: quantity * (type === itemType.EBOOK ? bookDoc.price * 0.45 : bookDoc.price)
        });
    } else {
        const itemIndex = cart.items.findIndex(item => item.book.toString() === book);
        if (itemIndex > -1) {
            cart.items[itemIndex].quantity += quantity;
        } else {
            console.log('HABIBIBIBIBI')
            cart.items.push({ book: bookDoc._id, bookTitle: bookDoc.name, quantity, type, price: type === itemType.EBOOK ? bookDoc.price * 0.45 : bookDoc.price });
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
    const book = req.params.bookId.trim(); // Remove any whitespace
    const { quantity } = req.body;
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
        return next(errorhandler("Cart not found", 404));
    }
    const itemIndex = cart.items.findIndex(item => item.book.toString() === book);
    if (itemIndex === -1) {
        return next(errorhandler("Book not found in cart", 404));
    }
    const bookDoc = await Book.findById(book);
    if (!bookDoc) {
        return next(errorhandler("Book not found", 404));
    }
    if (cart.items[itemIndex].type === itemType.PHYSICAL && quantity > bookDoc.stock) {
        return next(errorhandler(`Not enough Stock for ${bookDoc.name} with id: ${bookDoc._id}`, 400));
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
    const  book  = req.params.bookId.toString();
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
        return next(errorhandler("Cart not found", 404));
    }
    const itemIndex = cart.items.findIndex(item => item.book.toString() === book);
    if (itemIndex === -1) {
        return next(errorhandler("Book not found in cart", 404));
    }
    cart.items = cart.items.filter(item => item.book.toString() !== book);
    await cart.save();
    return successResponse({    
        res,
        statusCode: 200,
        message: "Book removed successfully",
        data: cart
    });
});