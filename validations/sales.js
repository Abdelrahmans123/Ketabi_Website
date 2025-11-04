import Joi from "joi";
import { paymentMethods } from "../utils/orderEnums.js";

export const getSalesSchema = Joi.object({
        paymentMethod: Joi.string().optional().default(paymentMethods.STRIPE).valid(...Object.values(paymentMethods)).messages({
            "string.base": "payment Method must be a text value.",
            "any.only": `payment Method must be one of: ${Object.values(paymentMethods).join(", ")}.`,
            "any.required": "payment Method is required.",
        }),
        page: Joi.number().integer().min(1).default(1).messages({
            'number.min': 'Page must be at least 1',
            'number.integer': 'Page must be an integer',
        }),
        limit: Joi.number().integer().min(1).max(100).default(10).messages({
            'number.min': 'Limit must be at least 1',
            'number.max': 'Limit cannot exceed 100',
            'number.integer': 'Limit must be an integer',
        }),
})