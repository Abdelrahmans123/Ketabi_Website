/**
 * @swagger
 * tags:
 *   name: Tickets
 *   description: Support ticket and chat management endpoints
 */

/**
 * @swagger
 * /api/tickets:
 *   get:
 *     summary: Get all support tickets (Admin only)
 *     description: Retrieve a list of all user support tickets. Only admins can access this endpoint.
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved all tickets
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     example: 6552fdfc1a3b2f4d8c21a9e0
 *                   user:
 *                     type: string
 *                     example: mahmoud@example.com
 *                   subject:
 *                     type: string
 *                     example: Payment not processed
 *                   status:
 *                     type: string
 *                     example: open
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                     example: 2025-10-20T14:48:00.000Z
 *       401:
 *         description: Unauthorized - missing or invalid JWT
 *       403:
 *         description: Forbidden - Admin role required
 */

/**
 * @swagger
 * /api/tickets/{id}:
 *   get:
 *     summary: Get chat messages for a specific support ticket
 *     description: Retrieve the real-time chat or message history between the user and support team for a given ticket ID.
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the ticket
 *         example: 6552fdfc1a3b2f4d8c21a9e0
 *     responses:
 *       200:
 *         description: Successfully retrieved ticket chat messages
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   sender:
 *                     type: string
 *                     example: mahmoud@example.com
 *                   message:
 *                     type: string
 *                     example: "I haven’t received my refund yet."
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *                     example: 2025-10-20T15:30:00.000Z
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Ticket not found or no chat messages
 */

import express from "express";
import { getAllTickets } from "../controllers/TicketController.js";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorization.js";
import { getChat } from "../socketIO/Chat/ChatController.js";
import { roleEnum } from "../utils/roleEnum.js";
const router = express.Router();
router.get("/", authenticate, authorize(roleEnum.admin), getAllTickets);
router.get("/:id", authenticate, getChat);
export default router;
