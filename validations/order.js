import { itemType, paymentMethods } from "../utils/orderEnums.js";
import Joi from "joi";

export const orderSchema = {
    createOrder: Joi.object({
        user: Joi.string()
            .required()
            .regex(/^[0-9a-fA-F]{24}$/)
            .messages({
                "any.required": "User ID is required",
                "string.empty": "User ID is required",
                "string.pattern.base": "Invalid User ID",
            }),
        items: Joi.array()
            .min(1)
            .required()
            .items(
                Joi.object({
                    book: Joi.string()
                        .required()
                        .regex(/^[0-9a-fA-F]{24}$/)
                        .messages({
                            "any.required": "Book ID is required for each item",
                            "string.empty": "Book ID is required for each item",
                            "string.pattern.base": "Invalid Book ID",
                        }),
                    quantity: Joi.number()
                        .integer()
                        .min(1)
                        .required()
                        .messages({
                            "any.required":
                                "Quantity is required for each item",
                            "number.base": "Quantity is required for each item",
                            "number.min":
                                "Quantity must be an integer of at least 1",
                            "number.integer":
                                "Quantity must be an integer of at least 1",
                        }),
                    price: Joi.number().min(0).required().messages({
                        "any.required": "Price is required for each item",
                        "number.base": "Price is required for each item",
                        "number.min":
                            "Price must be a number greater than or equal to 0",
                    }),
                    type: Joi.string()
                        .valid(...Object.values(itemType))
                        .required()
                        .messages({
                            "any.required":
                                "Item type is required for each item",
                            "string.empty":
                                "Item type is required for each item",
                            "any.only": "Item type not supported",
                        }),
                })
            )
            .messages({
                "any.required": "Order items are missing",
                "array.base": "Order items are missing",
                "array.min":
                    "Order must contain at least one item in an array format",
            }),
        totalPrice: Joi.number().min(0).optional().messages({
            "number.min":
                "Total price must be a number greater than or equal to 0",
        }),
        finalPrice: Joi.number().min(0).optional().messages({
            "number.min":
                "Final price must be a number greater than or equal to 0",
        }),
        shippingAddress: Joi.object({
            street: Joi.string(),
            city: Joi.string(),
            postalCode: Joi.string(),
            country: Joi.string(),
            phoneNumber: Joi.string(),
        })
            .optional()
            .custom((value, helpers) => {
                const items = helpers.state.ancestors[0].items;
                const hasPhysicalBook = items?.some(
                    (item) => item.type === itemType.PHYSICAL
                );

                if (hasPhysicalBook) {
                    if (
                        !value.street ||
                        !value.city ||
                        !value.postalCode ||
                        !value.country ||
                        !value.phoneNumber
                    ) {
                        return helpers.error("any.custom", {
                            message:
                                "All shipping address fields are required for physical book orders",
                        });
                    }
                }
                return value;
            })
            .messages({
                "object.base": "Shipping address must be an object",
                "any.custom":
                    "All shipping address fields are required for physical book orders",
            }),
        paymentMethod: Joi.string()
            .valid(...Object.values(paymentMethods))
            .required()
            .messages({
                "any.required": "Payment method is required",
                "string.empty": "Payment method is required",
                "any.only": "Payment method not supported",
            }),
        isGift: Joi.boolean().optional().messages({
            "boolean.base": "isGift must be a boolean",
        }),
        recipientEmail: Joi.string()
            .email()
            .when("isGift", {
                is: true,
                then: Joi.required().messages({
                    "any.required":
                        "Recipient email is required when the order is marked as a gift",
                }),
                otherwise: Joi.optional(),
            }),
        personalizedMessage: Joi.string().optional().messages({
            "string.base": "Personalized message must be a string",
        }),
    }),

    getOrder: Joi.object({
        orderId: Joi.string()
            .regex(/^[0-9a-fA-F]{24}$/)
            .required()
            .messages({
                "string.pattern.base": "Invalid Order ID",
            }),
    }),
};
