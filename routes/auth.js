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

import express from "express";
import {
    confirmEmail,
    confirmLogin,
    facebookLogin,
    forgotPassword,
    googleLogin,
    login,
    logout,
    refreshAccessToken,
    register,
    registerWithFacebook,
    registerWithGoogle,
    resendConfirmationOtp,
    resetPassword,
    verifyPhoneOtp,
} from "../controllers/AuthController.js";
import { validate } from "../middlewares/validation.js";
import {
    confirmEmailSchema,
    forgotPasswordSchema,
    loginSchema,
    registerSchema,
    resetPasswordSchema,
} from "../validations/auth.js";
import { authenticate } from "../middlewares/auth.js";
import { authLimiter } from "../middlewares/rateLimiter.js";
const router = express.Router();
router.post("/register", validate(registerSchema), register);
router.post("/confirm-email", validate(confirmEmailSchema), confirmEmail);
router.post("/login", validate(loginSchema), authLimiter, login);
router.post("/confirm-login", validate(confirmEmailSchema), confirmLogin);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post(
    "/reset-password",
    validate(resetPasswordSchema),
    authLimiter,
    resetPassword
);
router.post("/logout", authenticate, logout);
router.post("/register/google", registerWithGoogle);
router.post("/login/google", googleLogin);
router.post("/register/facebook", registerWithFacebook);
router.post("/login/facebook", facebookLogin);
router.post("/resend-confirmation-otp", resendConfirmationOtp);
router.post("/refresh", refreshAccessToken);
router.post("/verify-phone", verifyPhoneOtp);
export default router;
