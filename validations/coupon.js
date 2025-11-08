import Joi from "joi";
import { couponSortingEnums } from "../utils/couponSortingEnums.js";

export const getCouponsSchema = Joi.object({
    page: Joi.number().optional().min(1),
    limit: Joi.number().optional().min(1),
    sortBy: Joi.string().optional().valid(...Object.values(couponSortingEnums)),
    sortOrder: Joi.string().optional().valid("asc", "desc"),
    code: Joi.string().optional(),
    isActive: Joi.boolean().optional(),
    expired: Joi.string().optional().valid("true", "false"),
})

export const createCouponSchema = Joi.object({
    code: Joi.string().required(),
    description: Joi.string().required().min(10).max(150),
    discountPercentage: Joi.number().required().min(0).max(100),
    minOrderValue: Joi.number().required().min(0),
    expiryDate: Joi.date().required(),
    usageLimit: Joi.number().required().min(1),
    isActive: Joi.bool().required(),
    numOfUsers: Joi.number().optional().min(0)
})

export const editCouponSchema = Joi.object({
    code: Joi.string().optional(),
    description: Joi.string().optional().min(10).max(150),
    discountPercentage: Joi.number().optional().min(1).max(100),
    minOrderValue: Joi.number().optional().min(0),
    expiryDate: Joi.date().optional(),
    usageLimit: Joi.number().optional().min(1),
    isActive: Joi.bool().optional(),
});

export const editCouponIdSchema = Joi.object({
    CouponId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional().messages({ 'string.pattern.base': 'Invalid Coupon ID', })
})

export const deleteCouponSchema = Joi.object({
    CouponId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional().messages({ 'string.pattern.base': 'Invalid Coupon ID', })
})

export const getCouponSchema = Joi.object({
    CouponCode: Joi.string()
        .trim()
        .min(3)
        .max(20)
        .required()
        .messages({
            'string.empty': 'Coupon code is required',
            'string.min': 'Coupon code must be at least 3 characters',
            'string.max': 'Coupon code must be at most 20 characters',
        }),
})

export const checkCouponSchema = Joi.object({
    subtotal: Joi.number()
    .positive()
    .required()
    .messages({
      'number.base': 'Subtotal must be a number',
      'number.positive': 'Subtotal must be greater than zero',
      'any.required': 'Subtotal is required',
    }),
})