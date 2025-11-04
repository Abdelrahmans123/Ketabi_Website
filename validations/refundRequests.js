import Joi from "joi";
import { refundStatus } from "../utils/orderEnums.js";

export const getRefundsSchema = Joi.object({
    status: Joi.string().optional().default(refundStatus.PENDING).valid(...Object.values(refundStatus)).messages({
        "string.base": "Status must be a text value.",
        "any.only": `Status must be one of: ${Object.values(refundStatus).join(", ")}.`,
        "any.required": "Status is required.",
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
});

export const updateRefundSchema = Joi.object({
    id: Joi.string().hex().length(24).required().messages({
        'string.base': "Refund Request Id must be a string",
        'string.hex': "Not a valid Refund Request ID",
        'string.length': "Not a valid Refund Request ID",
        'string.required': "Refund Request ID is required"
    }),
});

export const updatedRefundBodySchema = Joi.object({
    action: Joi.string()
        .required()
        .valid(...Object.values(refundStatus))
        .messages({
            "string.base": "Action must be a text value.",
            "any.required": "Action is required.",
            "any.only": `Action must be one of: ${Object.values(refundStatus).join(", ")}.`,
        }),
    notes: Joi.string()
        .optional()
        .max(100)
        .messages({
            "string.base": "Notes must be a text value.",
            "string.max": "Notes cannot exceed 100 characters.",
        }),
});