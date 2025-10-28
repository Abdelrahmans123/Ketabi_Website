/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and user account management
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - username
 *             properties:
 *               username:
 *                 type: string
 *                 example: mahmoud123
 *               email:
 *                 type: string
 *                 example: mahmoud@example.com
 *               password:
 *                 type: string
 *                 example: "StrongPassword@123"
 *     responses:
 *       201:
 *         description: User registered successfully. Confirmation email sent.
 *       400:
 *         description: Invalid input data
 */

/**
 * @swagger
 * /api/auth/confirm-email:
 *   post:
 *     summary: Confirm user's email with OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Email confirmed successfully
 *       400:
 *         description: Invalid or expired OTP
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: mahmoud@example.com
 *               password:
 *                 type: string
 *                 example: StrongPassword@123
 *     responses:
 *       200:
 *         description: Login successful, returns JWT token
 *       401:
 *         description: Invalid credentials
 */

/**
 * @swagger
 * /api/auth/confirm-login:
 *   post:
 *     summary: Confirm login using OTP (after 2FA)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login confirmed
 *       400:
 *         description: Invalid OTP or user not found
 */

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Send password reset link or OTP to user's email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: mahmoud@example.com
 *     responses:
 *       200:
 *         description: Reset link sent successfully
 */

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using OTP or token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successfully
 */

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout the current user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */

/**
 * @swagger
 * /api/auth/register/google:
 *   post:
 *     summary: Register new user with Google OAuth
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Registered successfully via Google
 */

/**
 * @swagger
 * /api/auth/login/google:
 *   post:
 *     summary: Login existing user with Google OAuth
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged in successfully via Google
 */

/**
 * @swagger
 * /api/auth/register/facebook:
 *   post:
 *     summary: Register new user with Facebook OAuth
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Registered successfully via Facebook
 */

/**
 * @swagger
 * /api/auth/login/facebook:
 *   post:
 *     summary: Login existing user with Facebook OAuth
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged in successfully via Facebook
 */

/**
 * @swagger
 * /api/auth/resend-confirmation-otp:
 *   post:
 *     summary: Resend OTP for email confirmation
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: mahmoud@example.com
 *     responses:
 *       200:
 *         description: OTP resent successfully
 */

import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Ketabi API Documentation",
      version: "1.0.0",
      description:
        "REST API documentation for Ketabi (Bookstore project) built with Express & MongoDB.",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Local development server",
      },
    ],
  },
  apis: ["./routes/*.js"], 
};

const swaggerSpec = swaggerJsdoc(options);

export const swaggerDocs = (app) => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log("📘 Swagger UI available at: http://localhost:3000/api-docs");
};
