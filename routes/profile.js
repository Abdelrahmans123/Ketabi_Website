/**
 * @swagger
 * tags:
 *   name: Profile
 *   description: User profile and library management endpoints
 */

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get user profile
 *     description: Retrieve the currently authenticated user's profile information.
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 username:
 *                   type: string
 *                   example: mahmoud123
 *                 email:
 *                   type: string
 *                   example: mahmoud@example.com
 *                 role:
 *                   type: string
 *                   example: user
 *       401:
 *         description: Unauthorized - Missing or invalid JWT
 */

/**
 * @swagger
 * /api/users/update:
 *   put:
 *     summary: Update user profile
 *     description: Update the authenticated user's profile data (e.g., username, password, or avatar).
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: newName123
 *               password:
 *                 type: string
 *                 example: NewStrongPass@456
 *               avatar:
 *                 type: string
 *                 example: "https://cdn.example.com/avatars/user123.jpg"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/users/library:
 *   get:
 *     summary: Get user's book library
 *     description: Retrieve all books purchased or added by the authenticated user.
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved user's library
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   title:
 *                     type: string
 *                     example: The Alchemist
 *                   author:
 *                     type: string
 *                     example: Paulo Coelho
 *                   purchaseDate:
 *                     type: string
 *                     format: date
 *                     example: 2025-01-10
 *       401:
 *         description: Unauthorized
 */

import express from "express";
import { getProfile, updateProfile, getLibrary } from "../controllers/ProfileController.js";
import { authenticate } from "../middlewares/auth.js"

const router = express.Router();

router.get("/me", authenticate, getProfile);
router.put("/update", authenticate, updateProfile);
router.get("/library", authenticate, getLibrary)

export default router;
