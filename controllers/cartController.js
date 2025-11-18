import Cart from "../models/Cart.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { successResponse } from "../utils/successResponse.js";
import { itemType } from "../utils/orderEnums.js";
import { create, findById, findOne } from "../models/services/db.js";
import Book from "../models/Book.js";
import path from "path";

export const setCart = asyncHandler(async (req, res, next) => {
    let cart = await findOne({ model: Cart, query: { user: req.user._id } });
    if (!cart) {
        cart = new Cart({ user: req.user._id, items: req.body });
        await create({ model: Cart, data: cart });
    } else {
        cart.items = req.body;
        await cart.save();
    }
    return successResponse({
        res,
        statusCode: 200,
        message: "Cart Was Set successfully"
    });

})

export const getCart = asyncHandler(async (req, res, next) => {
    let cart = await findOne({
        model: Cart,
        query: { user: req.user._id },
        populate: {
            path: "items.book",
            select: "name price stock discount image",
        }
    });

    if (!cart) {
        cart = new Cart({ user: req.user._id, items: [] });
        await create({ model: Cart, data: cart });
    }

    const cleanCart = {
        items: cart.items.map((item) => ({
            _id: item.book._id,
            name: item.book.name,
            price: item.book.price,
            stock: item.book.stock,
            discount: item.book.discount,
            image: item.book.image,
            quantity: item.quantity,
            type: item.type,
        })),
        total: cart.totalPrice,
    };
    return successResponse({
        res,
        statusCode: 200,
        message: "Cart retrieved successfully",
        data: cleanCart,
    });
});

export const addTocart = asyncHandler(async (req, res, next) => {
    let { book, quantity, type } = req.body;
    let cart = await findOne({
        model: Cart,
        query: { user: req.user._id },
    });
    const bookDoc = await findById({ model: Book, id: book });
    if (type === itemType.EBOOK) {
        quantity = 1;
    }
    if (!bookDoc) {
        const error = new AppError("Book not found", 404);
        return next(error);
    }
    if (type === itemType.PHYSICAL && quantity > bookDoc.stock) {
        const error = new AppError("Not enough Stock", 400);
        return next(error);
    }
    if (!cart) {
        cart = new Cart({
            user: req.user._id,
            items: [
                {
                    book: bookDoc._id,
                    bookTitle: bookDoc.name,
                    quantity,
                    type,
                    price:
                        type === itemType.EBOOK
                            ? bookDoc.price * 0.45
                            : bookDoc.price,
                },
            ],
        });
    } else {
        const itemIndex = cart.items.findIndex(
            (item) => item.book.toString() === book
        );
        if (itemIndex > -1) {
            cart.items[itemIndex].type = type;
            if (cart.items[itemIndex].type === itemType.EBOOK) {
                cart.items[itemIndex].quantity = 1;
            } else {
                cart.items[itemIndex].quantity += quantity;
            }
        } else {
            cart.items.push({
                book: bookDoc._id,
                bookTitle: bookDoc.name,
                quantity,
                type,
                price:
                    type === itemType.EBOOK
                        ? bookDoc.price * 0.45
                        : bookDoc.price,
            });
        }
    }
    await cart.save();
    return successResponse({
        res,
        statusCode: 200,
        message: "Item added to cart successfully",
    });
});

export const updateCart = asyncHandler(async (req, res, next) => {
    const { book, quantity, type } = req.body;

    if (!quantity && !type) {
        const error = new AppError("missing properites to update", 404);
        return next(error);
    }

    let cart = await findOne({ model: Cart, query: { user: req.user._id } });
    if (!cart) {
        const error = new AppError("Cart not found", 404);
        return next(error);
    }

    const itemIndex = cart.items.findIndex((item) => item.book.toString() === book);

    if (itemIndex === -1) {
        const error = new AppError("Book not found in cart", 404);
        return next(error);
    }

    const bookDoc = await findById({ model: Book, id: book });

    if (!bookDoc) {
        const error = new AppError("Book not found", 404);
        return next(error);
    }

    if (type) {
        cart.items[itemIndex].type = type;
    }

    if (cart.items[itemIndex].type === itemType.EBOOK) {
        cart.items[itemIndex].quantity = 1;
    } else {
        if (quantity > bookDoc.stock) {
            const error = new AppError(`Not enough Stock for ${bookDoc.name} with id: ${bookDoc._id}`, 400);
            return next(error);
        } else {
            cart.items[itemIndex].quantity = quantity;
        }
    }

    await cart.save();

    return successResponse({
        res,
        statusCode: 200,
        message: "Cart updated successfully",
        data: cart,
    });
});

export const removeFromCart = asyncHandler(async (req, res, next) => {
    const { book } = req.body;
    let cart = await findOne({ model: Cart, query: { user: req.user._id } });
    if (!cart) {
        const error = new AppError("Cart not found", 404);
        return next(error);
    }
    const itemIndex = cart.items.findIndex(
        (item) => item.book.toString() === book
    );
    if (itemIndex === -1) {
        const error = new AppError("Book not found in cart", 404);
        return next(error);
    }
    cart.items = cart.items.filter((item) => item.book.toString() !== book);
    await cart.save();
    return successResponse({
        res,
        statusCode: 200,
        message: "Book removed successfully",
        data: cart,
    });
});
