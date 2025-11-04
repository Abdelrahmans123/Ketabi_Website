import Joi from "joi";
import { deliveryStatus, paymentStatus } from "../utils/orderEnums.js";

export const publisherIdSchema = Joi.object({
    publisherId: Joi.string().hex().length(24).required().messages({
        'string.base': "Publisher Id must be a string",
        'string.hex': "Not a valid ID",
        'string.length': "Not a valid ID",
        'string.required': "Publisher ID is required"
    }),
});

export const paginationSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(5).max(100).default(10),
})

export const publisherOrderIdSchema = Joi.object({
    publisherOrderId: Joi.string().hex().length(24).required().messages({
        'string.base': "Publisher Id must be a string",
        'string.hex': "Not a valid ID",
        'string.length': "Not a valid ID",
        'string.required': "Publisher ID is required"
    }),
});

export const publisherOrderUpdateSchema = Joi.object({
    bookId: Joi.string().hex().length(24).required().messages({
        'string.base': "Publisher Id must be a string",
        'string.hex': "Not a valid ID",
        'string.length': "Not a valid ID",
        'string.required': "Publisher ID is required"
    }),
    deliveryStatus: Joi.string().optional().valid(...Object.values(deliveryStatus)),
    paymentStatus: Joi.string().optional().valid(...Object.values(paymentStatus)),
})