/**
 * @swagger
 * tags:
 *   name: AdminRefunds
 *   description: Admin-only endpoints for managing refund requests and processing payments
 */

/**
 * @swagger
 * /api/adminRefund:
 *   get:
 *     summary: Get all refund requests
 *     description: Retrieve a list of all refund requests in the system. Only accessible by admins.
 *     tags: [AdminRefunds]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved list of refunds
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     example: 653afdfa12f5bc001f23a9e3
 *                   orderId:
 *                     type: string
 *                     example: 653afdfa12f5bc001f23a9d8
 *                   userEmail:
 *                     type: string
 *                     example: mahmoud@example.com
 *                   reason:
 *                     type: string
 *                     example: "Payment charged twice"
 *                   status:
 *                     type: string
 *                     enum: [pending, approved, rejected, refunded]
 *                     example: pending
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                     example: 2025-10-29T12:45:00.000Z
 *       401:
 *         description: Unauthorized - missing or invalid token
 *       403:
 *         description: Forbidden - admin role required
 */

/**
 * @swagger
 * /api/adminRefund/{id}:
 *   patch:
 *     summary: Update refund status
 *     description: Allows an admin to update the status of a specific refund request (e.g., approve or reject).
 *     tags: [AdminRefunds]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The refund request ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, approved, rejected, refunded]
 *                 example: approved
 *     responses:
 *       200:
 *         description: Refund status updated successfully
 *       400:
 *         description: Invalid refund status or request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin role required
 *       404:
 *         description: Refund request not found
 */

/**
 * @swagger
 * /api/adminRefund/{id}/refund:
 *   post:
 *     summary: Process refund payment
 *     description: Executes the actual refund payment (e.g., via Stripe or another payment provider). Admin-only action.
 *     tags: [AdminRefunds]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The refund request ID to process
 *     responses:
 *       200:
 *         description: Refund processed successfully
 *       400:
 *         description: Invalid refund operation or already processed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin role required
 *       404:
 *         description: Refund request not found
 */


import express from "express";
import {
  getRefunds,
  updateRefundStatus,
  processRefund,
} from "../controllers/refundController.js";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorization.js";
import { roleEnum } from "../utils/roleEnum.js";
import { paramValidate, queryValidate, validate } from "../middlewares/validation.js";
import { getRefundsSchema, updateRefundSchema, updatedRefundBodySchema } from "../validations/refundRequests.js";

const router = express.Router();

router.get("/",authenticate, authorize(roleEnum.admin), queryValidate(getRefundsSchema), getRefunds); 
router.patch("/:id", authenticate, authorize(roleEnum.admin), paramValidate(updateRefundSchema), validate(updatedRefundBodySchema),updateRefundStatus); 
router.post("/:id/refund", authenticate, authorize(roleEnum.admin), paramValidate(updateRefundSchema), processRefund);

export default router;