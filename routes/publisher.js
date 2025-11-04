/**
 * @swagger
 * tags:
 *   name: Publishers
 *   description: Publisher and admin endpoints for managing publishers, books, and orders
 */

/**
 * @swagger
 * /api/publishers:
 *   post:
 *     summary: Create a new publisher
 *     description: Allows an admin to register or create a new publisher profile.
 *     tags: [Publishers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *                 example: Penguin Books
 *               email:
 *                 type: string
 *                 example: contact@penguin.com
 *               description:
 *                 type: string
 *                 example: Global book publisher
 *     responses:
 *       201:
 *         description: Publisher created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized - missing or invalid JWT
 *       403:
 *         description: Forbidden - admin role required
 */

/**
 * @swagger
 * /api/publishers/{publisherId}/books:
 *   get:
 *     summary: Get all books for a publisher
 *     description: Retrieve a list of all books published by a specific publisher.
 *     tags: [Publishers]
 *     parameters:
 *       - in: path
 *         name: publisherId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the publisher
 *     responses:
 *       200:
 *         description: Successfully retrieved publisher books
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   title:
 *                     type: string
 *                     example: "The Art of Thinking Clearly"
 *                   author:
 *                     type: string
 *                     example: Rolf Dobelli
 *                   price:
 *                     type: number
 *                     example: 19.99
 *       404:
 *         description: Publisher not found or has no books
 */

/**
 * @swagger
 * /api/publishers/{publisherId}/orders:
 *   get:
 *     summary: Get all orders for a publisher
 *     description: Allows admin or publisher to view all orders related to that publisher's books.
 *     tags: [Publishers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: publisherId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the publisher
 *     responses:
 *       200:
 *         description: Successfully retrieved publisher orders
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin or Publisher role required
 *       404:
 *         description: Publisher not found or no orders
 */

/**
 * @swagger
 * /api/publishers/{publisherOrderId}:
 *   patch:
 *     summary: Update publisher order status
 *     description: Allows publisher or admin to update the status of a publisher order.
 *     tags: [Publishers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: publisherOrderId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the publisher order to update
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
 *                 enum: [pending, shipped, delivered, cancelled]
 *                 example: shipped
 *     responses:
 *       200:
 *         description: Publisher order updated successfully
 *       400:
 *         description: Invalid data or order not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin or Publisher role required
 */


import express from "express";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorization.js";
import {
  getPublishedBooks,
  getPublisherOrders,
  createPublisher,
  updatePublisherOrder
} from "../controllers/publisherController.js";
import { roleEnum } from "../utils/roleEnum.js";
import { paramValidate, queryValidate, validate } from "../middlewares/validation.js";
import { paginationSchema, publisherIdSchema, publisherOrderIdSchema, publisherOrderUpdateSchema } from "../validations/publisher.js";

const router = express.Router();

router.post("/", authenticate, authorize(roleEnum.admin), validate(publisherIdSchema), createPublisher);

router.get("/:publisherId/books", paramValidate(publisherIdSchema), queryValidate(paginationSchema), getPublishedBooks);

router.get("/:publisherId/orders", authenticate, authorize(roleEnum.admin, roleEnum.publisher), paramValidate(publisherIdSchema), queryValidate(paginationSchema), getPublisherOrders);

router.patch("/:publisherOrderId", authenticate, authorize(roleEnum.publisher, roleEnum.admin), paramValidate(publisherOrderIdSchema), validate(publisherOrderUpdateSchema), updatePublisherOrder);

export default router;
