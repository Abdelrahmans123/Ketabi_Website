import { body , param } from "express-validator";
import { itemType } from "../utils/orderEnums.js";
import Joi from "joi";

export const getCartSchema = Joi.object({
    // No parameters needed for getting the cart

});

export const addToCartSchema = Joi.object({
    book: Joi.string().required(),//.message('Invalid Book Id'),
    quantity: Joi.number().required().min(1),//.message('Invalid quantity. Minimum is 1'),
    type: Joi.string().required().valid("physical","ebook")
});

export const updateCartSchema = Joi.object({
    quantity: Joi.number().required().min(1),//.message('Invalid quantity to updated. Minimum is 1')
});

export const removeCartItemSchema = Joi.object({
    book: Joi.string().required()//.message('Invalid Book Id')
})


/* export const addToCart = [
    body("book")
        .isEmpty()
        .withMessage("Book ID is required")
        .isMongoId()
        .withMessage("Invalid Book ID"),
    body("quantity")
        .isEmpty()
        .withMessage("Quantity is required")
        .isInt({ min: 1 })
        .withMessage("Quantity must be an integer of at least 1"),
    body("type")
        .isEmpty()
        .withMessage("Item type is required")
        .isIn(Object.values(itemType))
        .withMessage("Item type not supported"),
]; */

/* export const updateCartItem = [
    body("quantity")
        .isEmpty()
        .withMessage("Quantity is required")
        .isInt({ min: 1 })
        .withMessage("Quantity must be an integer of at least 1"),
    body("book")
        .isEmpty()
        .withMessage("Book ID is required")
        .isMongoId()
        .withMessage("Invalid Book ID")
]; */

/* export const removeCartItem = [
    param("book")
        .isEmpty()
        .withMessage("Book ID is required")
        .isMongoId()
        .withMessage("Invalid Book ID"),
]; */
