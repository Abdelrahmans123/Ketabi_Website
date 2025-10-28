import express from "express";
import {
    confirmEmail,
    confirmLogin,
    facebookLogin,
    forgotPassword,
    googleLogin,
    login,
    logout,
    register,
    registerWithFacebook,
    registerWithGoogle,
    resendConfirmationOtp,
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
export default router;
