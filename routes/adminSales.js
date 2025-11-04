/**
 * @swagger
 * tags:
 *   name: AdminSales
 *   description: Admin-only endpoint for viewing all sales records and analytics
 */

/**
 * @swagger
 * /api/adminSales:
 *   get:
 *     summary: Get all sales records
 *     description: Retrieve all sales transactions with related publisher and book details. Only accessible to admins.
 *     tags: [AdminSales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: publisher
 *         schema:
 *           type: string
 *           example: 653afdfa12f5bc001f23a9d8
 *         description: Optional filter by publisher ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *           example: 2025-10-01
 *         description: Optional start date filter (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *           example: 2025-10-31
 *         description: Optional end date filter (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Successfully retrieved sales list
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
 *                   publisher:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: Penguin Books
 *                       email:
 *                         type: string
 *                         example: contact@penguin.com
 *                   publisherOrder:
 *                     type: object
 *                     properties:
 *                       totalPrice:
 *                         type: number
 *                         example: 199.99
 *                   items:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         book:
 *                           type: object
 *                           properties:
 *                             title:
 *                               type: string
 *                               example: "Clean Code"
 *                         quantity:
 *                           type: number
 *                           example: 2
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                     example: 2025-10-29T13:15:00.000Z
 *       401:
 *         description: Unauthorized - missing or invalid JWT token
 *       403:
 *         description: Forbidden - only admins can access this endpoint
 *       500:
 *         description: Internal server error
 */


import express from "express";
import Sale from "../models/Sale.js";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorization.js";
import { roleEnum } from "../utils/roleEnum.js";
import { getSalesAdmin } from "../controllers/salesController.js";
import { queryValidate } from "../middlewares/validation.js";
import { getSalesSchema } from "../validations/sales.js";

const router = express.Router();

router.get("/", authenticate, authorize(roleEnum.admin), queryValidate(getSalesSchema) ,getSalesAdmin);

export default router;
