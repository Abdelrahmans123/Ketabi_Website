/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management and checkout endpoints
 */

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order (checkout)
 *     description: Allows authenticated users to place an order for items in their cart.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *               - shippingAddress
 *               - paymentMethod
 *             properties:
 *               items:
 *                 type: array
 *                 description: List of ordered books
 *                 items:
 *                   type: object
 *                   properties:
 *                     bookId:
 *                       type: string
 *                       example: 654fda9c3d8e7a2b1c8e5671
 *                     quantity:
 *                       type: integer
 *                       example: 2
 *               shippingAddress:
 *                 type: string
 *                 example: "123 Nile St, Cairo, Egypt"
 *               paymentMethod:
 *                 type: string
 *                 enum: [stripe, cash_on_delivery]
 *                 example: stripe
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Invalid data or out-of-stock items
 *       401:
 *         description: Unauthorized - Missing or invalid JWT
 */

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get all orders (Admin only)
 *     description: Retrieve all orders from all users. Accessible only by admin accounts.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Number of orders per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           example: delivered
 *         description: Filter orders by status
 *     responses:
 *       200:
 *         description: List of all orders
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admins only
 */

/**
 * @swagger
 * /api/orders/order-history:
 *   get:
 *     summary: Get order history for a user
 *     description: Retrieve all orders placed by the authenticated user.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 5
 *         description: Number of orders per page
 *     responses:
 *       200:
 *         description: Successfully retrieved user's order history
 *       401:
 *         description: Unauthorized
 */

import express from "express";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorization.js";
import { validate, queryValidate } from "../middlewares/validation.js";
import { createOrder, getOrderHistory, getOrdersAdmin, getSingleOrder } from "../controllers/orderController.js"
import { createOrderSchema, getUserOrderSchema, getAllOrdersSchema } from "../validations/order.js";
import { roleEnum } from "../utils/roleEnum.js";
import { handlePaymobCallback } from "../controllers/paymobWebhook.js";
const router = express.Router();

// create order for users
router.post('/', authenticate, authorize(roleEnum.user), validate(createOrderSchema), createOrder);

// get orders for admins
router.get('/', authenticate, authorize(roleEnum.admin), queryValidate(getAllOrdersSchema), getOrdersAdmin);

// get user own orders  
router.get('/order-history', authenticate, queryValidate(getUserOrderSchema), getOrderHistory)

// Get a single order by ID (belongs to the logged-in user)
router.get('/order/:orderId', authenticate, getSingleOrder);

router.post('/payment/paymob/callback', handlePaymobCallback);
router.get('/payment/paymob/callback', handlePaymobCallback);
router.get('/payment/paymob/test', (req, res) => {
    res.json({ message: 'Webhook endpoint working!' });
});

export default router;
