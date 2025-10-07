import express from "express";
import {
	confirmEmail,
	confirmLogin,
	forgotPassword,
	login,
	logout,
	register,
	resetPassword,
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

const router = express.Router();
router.post("/register", validate(registerSchema), register);
router.post("/confirm-email", validate(confirmEmailSchema), confirmEmail);
router.post("/login", validate(loginSchema), login);
router.post("/confirm-login", validate(confirmEmailSchema), confirmLogin);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);
router.post("/logout", authenticate, logout	);
export default router;
