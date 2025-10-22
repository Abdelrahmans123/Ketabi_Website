import express from "express";
import { authenticate } from "../middlewares/auth.js";
import { validate } from "../middlewares/validation.js";
import { getAllCoupons, addCoupon } from "../controllers/couponController.js";
import { authorize } from "../middlewares/authorization.js";
import { roleEnum } from "../utils/roleEnum.js";
import { createCouponSchema } from "../validations/coupon.js";

const router = express.Router();

router.get('/', authenticate, authorize(roleEnum.admin), getAllCoupons);
router.post('/', authenticate, authorize(roleEnum.admin), validate (createCouponSchema), addCoupon);

/*
router.get('/:CouponCode', authenticate, validate (getCouponSchema), getCoupon);
router.put('/:CouponId', authenticate, validate (editCouponSchema), editCoupon);
router.delete('/:CouponId', authenticate, validate (deleteCouponSchema), deleteCoupon)
*/

export default router;