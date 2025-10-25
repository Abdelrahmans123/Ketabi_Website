import express from "express";
import { authenticate } from "../middlewares/auth.js";
import { validate } from "../middlewares/validation.js";
import { getAllCoupons, addCoupon, editCoupon, deleteCoupon } from "../controllers/couponController.js";
import { authorize } from "../middlewares/authorization.js";
import { roleEnum } from "../utils/roleEnum.js";
import { createCouponSchema, getCouponsSchema, editCouponSchema, deleteCouponSchema } from "../validations/coupon.js";

const router = express.Router();

router.get('/', authenticate, authorize(roleEnum.admin), validate (getCouponsSchema), getAllCoupons);
router.post('/', authenticate, authorize(roleEnum.admin), validate (createCouponSchema), addCoupon);
router.put('/:CouponId', authenticate, authorize(roleEnum.admin), validate (editCouponSchema), editCoupon);
router.delete('/:CouponId', authenticate, authorize(roleEnum.admin), validate (deleteCouponSchema), deleteCoupon)


export default router;