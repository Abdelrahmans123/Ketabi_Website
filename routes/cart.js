/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: Shopping cart management endpoints
 */

/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: Get the user's cart
 *     description: Retrieve all books currently in the authenticated user's cart.
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved cart items
 *       401:
 *         description: Unauthorized - JWT token missing or invalid
 */

/**
 * @swagger
 * /api/cart:
 *   post:
 *     summary: Add a book to the user's cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookId
 *               - quantity
 *             properties:
 *               bookId:
 *                 type: string
 *                 example: 654fe85b3c4fbd45f1cabc21
 *               quantity:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       201:
 *         description: Book added to cart successfully
 *       400:
 *         description: Invalid data or book not found
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/cart/{bookId}:
 *   put:
 *     summary: Update the quantity of a book in the cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the book in the cart
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: integer
 *                 example: 3
 *     responses:
 *       200:
 *         description: Cart updated successfully
 *       404:
 *         description: Book not found in cart
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/cart/{bookId}:
 *   delete:
 *     summary: Remove a book from the user's cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the book to remove
 *     responses:
 *       200:
 *         description: Book removed from cart successfully
 *       404:
 *         description: Book not found in cart
 *       401:
 *         description: Unauthorized
 */

import express from "express";
import { authenticate } from "../middlewares/auth.js";
import { validate } from "../middlewares/validation.js";
import {
    addTocart,
    getCart,
    removeFromCart,
    updateCart,
    setCart
} from "../controllers/cartController.js";
import {
    addToCartSchema,
    updateCartSchema,
    removeFromCartSchema,
    setCartSchema
} from "../validations/cart.js";

const router = express.Router();

router.get("/", authenticate, getCart);
router.post("/", authenticate, validate(addToCartSchema), addTocart);
router.put("/", authenticate, validate(updateCartSchema), updateCart);
router.put("/SetCart", authenticate, validate(setCartSchema), setCart)
router.delete("/", authenticate, validate(removeFromCartSchema), removeFromCart);

export default router;
