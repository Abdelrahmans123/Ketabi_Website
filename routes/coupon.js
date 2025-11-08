/**
 * @swagger
 * tags:
 *   name: Coupons
 *   description: Coupon management endpoints (Admin only)
 */

/**
 * @swagger
 * /api/coupons:
 *   get:
 *     summary: Get all coupons
 *     description: Retrieve all available coupons. Only accessible to admin users.
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all coupons
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   code:
 *                     type: string
 *                     example: SAVE10
 *                   discount:
 *                     type: number
 *                     example: 10
 *                   expirationDate:
 *                     type: string
 *                     format: date
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only admins can access
 */

/**
 * @swagger
 * /api/coupons:
 *   post:
 *     summary: Create a new coupon
 *     description: Add a new coupon to the system (Admin only)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - discount
 *               - expirationDate
 *             properties:
 *               code:
 *                 type: string
 *                 example: SAVE20
 *               discount:
 *                 type: number
 *                 example: 20
 *               expirationDate:
 *                 type: string
 *                 format: date
 *                 example: 2025-12-31
 *     responses:
 *       201:
 *         description: Coupon created successfully
 *       400:
 *         description: Invalid coupon data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only admins can access
 */

/**
 * @swagger
 * /api/coupons/{CouponId}:
 *   put:
 *     summary: Edit an existing coupon
 *     description: Update coupon information (Admin only)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: CouponId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the coupon to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 example: SAVE30
 *               discount:
 *                 type: number
 *                 example: 30
 *               expirationDate:
 *                 type: string
 *                 format: date
 *                 example: 2026-01-01
 *     responses:
 *       200:
 *         description: Coupon updated successfully
 *       400:
 *         description: Invalid update data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only admins can access
 *       404:
 *         description: Coupon not found
 */

/**
 * @swagger
 * /api/coupons/{CouponId}:
 *   delete:
 *     summary: Delete a coupon
 *     description: Remove a coupon from the system (Admin only)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: CouponId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the coupon to delete
 *     responses:
 *       200:
 *         description: Coupon deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only admins can access
 *       404:
 *         description: Coupon not found
 */

import express from "express";
import { authenticate } from "../middlewares/auth.js";
import { paramValidate, queryValidate, validate } from "../middlewares/validation.js";
import { getAllCoupons, addCoupon, editCoupon, deleteCoupon, getCoupon } from "../controllers/couponController.js";
import { authorize } from "../middlewares/authorization.js";
import { roleEnum } from "../utils/roleEnum.js";
import { createCouponSchema, getCouponsSchema, editCouponSchema, deleteCouponSchema, editCouponIdSchema, checkCouponSchema, getCouponSchema } from "../validations/coupon.js";

const router = express.Router();

router.get('/', authenticate, authorize(roleEnum.admin), queryValidate (getCouponsSchema), getAllCoupons);
router.get('/:CouponCode', authenticate, paramValidate(getCouponSchema), queryValidate(checkCouponSchema), getCoupon)
router.post('/', authenticate, authorize(roleEnum.admin), validate (createCouponSchema), addCoupon);
router.put('/:CouponId', authenticate, authorize(roleEnum.admin), validate (editCouponSchema), paramValidate(editCouponIdSchema), editCoupon);
router.delete('/:CouponId', authenticate, authorize(roleEnum.admin), paramValidate (deleteCouponSchema), deleteCoupon)


export default router;