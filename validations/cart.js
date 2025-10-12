import { body , param } from "express-validator";
import { itemType } from "../utils/orderEnums.js";

export const addToCart = [
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
];

export const updateCartItem = [
    body("quantity")
        .isEmpty()
        .withMessage("Quantity is required")
        .isInt({ min: 1 })
        .withMessage("Quantity must be an integer of at least 1"),
    param("book")
        .isEmpty()
        .withMessage("Book ID is required")
        .isMongoId()
        .withMessage("Invalid Book ID")
];

export const removeCartItem = [
    param("book")
        .isEmpty()
        .withMessage("Book ID is required")
        .isMongoId()
        .withMessage("Invalid Book ID"),
];
