import { body } from "express-validator";
import { itemType, paymentMethod } from "../utils/orderEnums.js";

export const orderSchema = {
    createOrder: [
        body("user")
            .notEmpty()
            .withMessage("User ID is required")
            .isMongoId()
            .withMessage("Invalid User ID"),
        body("items")
            .notEmpty()
            .withMessage("Order items are missing")
            .isArray({ min: 1 })
            .withMessage("Order must contain at least one item in an array format"),
        body("items.*.book")
            .notEmpty()
            .withMessage("Book ID is required for each item")
            .isMongoId()
            .withMessage("Invalid Book ID"),
        body("items.*.quantity")
            .notEmpty()
            .withMessage("Quantity is required for each item")
            .isInt({ min: 1 })
            .withMessage("Quantity must be an integer of at least 1"),
        body("items.*.price")
            .notEmpty()
            .withMessage("Price is required for each item")
            .isFloat({ min: 0 })
            .withMessage("Price must be a number greater than or equal to 0"),
        body("items.*.type")
            .notEmpty()
            .withMessage("Item type is required for each item")
            .isIn(Object.values(itemType))
            .withMessage("Item type not supported"),
        body('totalPrice')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('Total price must be a number greater than or equal to 0'),
        body('finalPrice')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('Final price must be a number greater than or equal to 0'),
        body("shippingAddress")
            .optional()
            .isObject()
            .withMessage("Shipping address must be an object")
            .custom((value, { req }) => {
                const hasPhysicalBook = req.body.items.some(item => item.type === itemType.PHYSICAL);
                if (hasPhysicalBook && (!value.street || !value.city || !value.postalCode || !value.country || !value.phoneNumber)) {
                    throw new Error('All shipping address fields are required for physical book orders');
                }
                return true;
            }),
        body("paymentMethod")
            .notEmpty()
            .withMessage("Payment method is required")
            .isIn(Object.values(paymentMethod))
            .withMessage("Payment method not supported"),
        body("isGift")
            .optional()
            .isBoolean()
            .withMessage("isGift must be a boolean")
            .custom((value, { req }) => {
                if (value && !req.body.recipientEmail) {
                    throw new Error('Recipient email is required when the order is marked as a gift');
                }
            }),
        body("personalizedMessage")
            .optional()
            .isString()
            .withMessage("Personalized message must be a string"),
    ],
    getOrder: [
        param('orderId')
            .isMongoId()
            .withMessage('Invalid Order ID'),
    ]
}

/* 
export const orderSchema = [
    body("user")
        .notEmpty()
        .withMessage("User ID is required")
        .isMongoId()
        .withMessage("Invalid User ID"),
    body("items")
        .notEmpty()
        .withMessage("Order items are missing")
        .isArray({ min: 1 })
        .withMessage("Order must contain at least one item in an array format"),
    body("items.*.book")
        .notEmpty()
        .withMessage("Book ID is required for each item")
        .isMongoId()
        .withMessage("Invalid Book ID"),
    body("items.*.bookTitle")
        .notEmpty()
        .withMessage("Book title is required for each item")
        .isString()
        .withMessage("Book title must be a string")
        .isLength({ min: 1 })
        .withMessage("Book title cannot be empty"),
    body("items.*.quantity")
        .notEmpty()
        .withMessage("Quantity is required for each item")
        .isInt({ min: 1 })
        .withMessage("Quantity must be an integer of at least 1"),
    body("items.*.price")
        .notEmpty()
        .withMessage("Price is required for each item")
        .isFloat({ min: 0 })
        .withMessage("Price must be a number greater than or equal to 0"),
    body("items.*.type")
        .notEmpty()
        .withMessage("Item type is required for each item")
        .isIn(Object.values(itemType))
        .withMessage("Item type not supported"),
    body('totalPrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Total price must be a number greater than or equal to 0'),
    body('finalPrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Final price must be a number greater than or equal to 0'),
    body("shippingAddress")
        .optional()
        .isObject()
        .withMessage("Shipping address must be an object")
        .custom((value, { req }) => {
            const hasPhysicalBook = req.body.items.some(item => item.type === itemType.PHYSICAL);
            if (hasPhysicalBook && (!value.street || !value.city || !value.postalCode || !value.country || !value.phoneNumber)) {
                throw new Error('All shipping address fields are required for physical book orders');
            }
            return true;
        }),
    body("paymentMethod")
        .notEmpty()
        .withMessage("Payment method is required")
        .isIn(Object.values(paymentMethod))
        .withMessage("Payment method not supported"),
    body("isGift")
        .optional()
        .isBoolean()
        .withMessage("isGift must be a boolean")
        .custom((value, { req }) => {
            if (value && !req.body.recipientEmail) {
                throw new Error('Recipient email is required when the order is marked as a gift');
            }
        }),
    body("personalizedMessage")
        .optional()
        .isString()
        .withMessage("Personalized message must be a string"),
] */