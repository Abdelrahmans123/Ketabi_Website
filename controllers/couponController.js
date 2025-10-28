import User from "../models/User.js";
import Coupon from "../models/Coupon.js";
import {
    create,
    findAll,
    findById,
    findOne,
    findOneAndUpdate,
    remove,
} from "../models/services/db.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { roleEnum } from "../utils/roleEnum.js";
import { successResponse } from "../utils/successResponse.js";

export const getAllCoupons = asyncHandler(async (req, res, next) => {
    const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
        code,
        isActive,
        expired,
    } = req.query;

    const filters = {};

    // Handle search by code name
    if (code) filters.code = new RegExp(code, "i");

    // Handle activitation status
    if (isActive) filters.isActive = isActive;

    if (expired === "true") {
        filters.expiryDate = { $lt: new Date() };
    } else if (expired === "false") {
        filters.expiryDate = { $gte: new Date() };
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };
    const coupons = await findAll({
        model: Coupon,
        filter: filters,
        sort,
        skip,
        limit: parseInt(limit),
    });
    const total = await Coupon.countDocuments(filters);

    if (!coupons || coupons.length === 0) {
        return successResponse({
            res,
            statusCode: 200,
            message: "No Coupons Found",
            data: [],
        });
    }

    return successResponse({
        res,
        statusCode: 200,
        message: "Coupons retrieved successfully",
        data: {
            coupons: coupons,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit),
            },
        },
    });
});

export const addCoupon = asyncHandler(async (req, res, next) => {
    const {
        code,
        description,
        discountPercentage,
        minOrderValue,
        expiryDate,
        usageLimit,
        isActive,
    } = req.body;
    const CouponData = {
        code,
        description,
        discountPercentage,
        minOrderValue,
        expiryDate,
        usageLimit,
        isActive,
    };
    const coupon = await create({ model: Coupon, data: CouponData });
    return successResponse({
        res,
        statusCode: 201,
        message: "Coupon Added Successfully",
        data: coupon,
    });
});

export const editCoupon = asyncHandler(async (req, res, next) => {
    const id = req.params.CouponId;

    const coupon = await findById({ model: Coupon, id });

    if (!coupon) {
        const error = new AppError("Coupon not found", 404);
        return next(error);
    }

    const {
        code = coupon.code,
        description = coupon.description,
        discountPercentage = coupon.discountPercentage,
        minOrderValue = coupon.minOrderValue,
        expiryDate = coupon.expiryDate,
        usageLimit = coupon.usageLimit,
        isActive = coupon.isActive,
    } = req.body;

    const CouponData = {
        code,
        description,
        discountPercentage,
        minOrderValue,
        expiryDate,
        usageLimit,
        isActive,
    };

    const updatedCoupon = await findOneAndUpdate({
        model: Coupon,
        query: { _id: id },
        data: CouponData,
    });

    if (!updatedCoupon) {
        return next(new AppError("Coupon not found", 404));
    }

    return successResponse({
        res,
        statusCode: 200,
        message: "Coupon updated successfully",
        data: updatedCoupon,
    });
});

export const deleteCoupon = asyncHandler(async (req, res, next) => {
    const id = req.params.CouponId;

    const coupon = await findById({ model: Coupon, id });

    if (!coupon) {
        const error = new AppError("Coupon not found", 404);
        return next(error);
    }

    await remove({ model: Coupon, query: { _id: id } });

    return successResponse({
        res,
        statusCode: 200,
        message: "Coupon deleted successfully",
    });
});
