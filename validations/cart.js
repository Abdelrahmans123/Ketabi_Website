
import Joi from "joi";
import { itemType } from "../utils/orderEnums.js";

export const cartItemSchema = Joi.object({
    book: Joi.string().required().messages({
        'any.required': 'Book ID is required',
        'string.empty': 'Book ID cannot be empty'
    }),
    type: Joi.string().valid('physical', 'ebook').required().messages({
        'any.only': 'Type must be either physical or ebook',
        'any.required': 'Type is required'
    }),
    quantity: Joi.number().integer().min(1).required().messages({
        'number.base': 'Quantity must be a number',
        'number.min': 'Quantity must be at least 1',
        'any.required': 'Quantity is required'
    })
});

export const setCartSchema = Joi.array().items(cartItemSchema).min(0).required().messages({
    'array.base': 'Cart must be an array of items',
    'array.min': 'Cart must contain at least zero item',
    'any.required': 'Cart cannot be empty'
});

export const addToCartSchema = Joi.object({
    book: Joi.string().hex().length(24).required().messages({
        "string.base": "Book ID must be a string.",
        "string.hex": "Book ID must be a valid hexadecimal string.",
        "string.length": "Book ID must be exactly 24 characters long.",
        "any.required": "Book ID is required.",
    }),
    quantity: Joi.number().integer().min(1).max(10).required().messages({
        "number.base": "Quantity must be a number.",
        "number.integer": "Quantity must be an integer.",
        "number.min": "You must add at least one item.",
        "number.max": "You cannot add more than 10 of the same item.",
        "any.required": "Quantity is required.",
    }),
    type: Joi.string()
        .valid(...Object.values(itemType))
        .required()
        .messages({
            "string.base": "Type must be a string.",
            "any.only": `Type must be one of the following: ${Object.values(itemType).join(", ")}.`,
            "any.required": "Type is required.",
        }),
});

export const updateCartSchema = Joi.object({
    book: Joi.string().hex().length(24).required().messages({
        "string.base": "Book ID must be a string.",
        "string.hex": "Book ID must be a valid hexadecimal string.",
        "string.length": "Book ID must be exactly 24 characters long.",
        "any.required": "Book ID is required.",
    }),
    quantity: Joi.number().integer().min(0).optional().messages({
        "number.base": "Quantity must be a number.",
        "number.integer": "Quantity must be an integer.",
        "number.min": "Quantity cannot be less than 0."
    }),
    type: Joi.string()
        .valid(...Object.values(itemType))
        .optional()
        .messages({
            "string.base": "Type must be a string.",
            "any.only": `Type must be one of the following: ${Object.values(itemType).join(", ")}.`,
        }),
});

export const removeFromCartSchema = Joi.object({
    book: Joi.string().hex().length(24).required().messages({
        "string.base": "Book ID must be a string.",
        "string.hex": "Book ID must be a valid hexadecimal string.",
        "string.length": "Book ID must be exactly 24 characters long.",
        "any.required": "Book ID is required to remove an item from cart.",
    }),
});


