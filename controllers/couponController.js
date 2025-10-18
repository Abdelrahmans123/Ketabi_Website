import User from "../models/User.js";
import Coupon from "../models/Coupon.js";
import { create, findAll, findById, findOne, findOneAndUpdate, remove } from "../models/services/db.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { roleEnum } from "../utils/roleEnum.js";
import { successResponse } from "../utils/successResponse.js";

function errorHandler(errMsg, statusCode, next) {
    const error = new AppError(errMsg, statusCode);
    return next(error)
}


export const getAllCoupons = asyncHandler(async (req, res, next) => {
    
    const allCoupons = await findAll(Coupon);
    
    if (!allCoupons || allCoupons.length === 0) {
        return successResponse({
            res,
            statusCode: 200,
            message: "No Coupons Found",
        });
    }

    return successResponse({
        res,
        statusCode: 201,
        message: "All Coupons",
        data: allCoupons,
    });
})

export const addCoupon = asyncHandler(async (req, res, next) => {
    const {code, description, discountPercentage, minOrderValue, expiryDate, usageLimit, isActive} = req.body;
    const CouponData = {
        code,
        description, 
        discountPercentage, 
        minOrderValue, 
        expiryDate, 
        usageLimit, 
        isActive
    }
    const coupon = await create(Coupon, CouponData);
    return successResponse({
        res,
        statusCode: 201,
        message: "Coupon Added Successfully",
        data: coupon,
    });
})
