import Joi from "joi";

export const getCouponSchema = Joi.object({
    CouponCode: Joi.string().required()
})

export const createCouponSchema = Joi.object({
    code: Joi.string().required(),
    description: Joi.string().required().min(10).max(150),
    discountPercentage: Joi.number().required().min(0).max(100),
    minOrderValue: Joi.number().required().min(0),
    expiryDate: Joi.date().required(),
    usageLimit: Joi.number().required().min(1),
    isActive: Joi.bool().required()
})

export const editCouponSchema = {
    code: Joi.string().required(),
    description: Joi.string().required().min(10).max(150),
    discountPercentage: Joi.number().required().min(1).max(100),
    minOrderValue: Joi.number().required().min(0),
    expiryDate: Joi.date().required(),
    usageLimit: Joi.number().required().min(1),
    isActive: Joi.bool().required()
    
}
export const deleteCouponSchema = {
    CouponCode: Joi.string().required()
}