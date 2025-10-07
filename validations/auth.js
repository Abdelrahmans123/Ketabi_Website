import { body } from "express-validator";

export const registerSchema = [
	body("name")
		.notEmpty()
		.withMessage("Name is Required")
		.isLength({ min: 2 })
		.withMessage("Name must be at least 3 characters"),
	body("email")
		.notEmpty()
		.withMessage("Email is Required")
		.isEmail()
		.withMessage("Email is not valid"),
	body("password")
		.notEmpty()
		.withMessage("Password is Required")
		.isLength({ min: 8 })
		.withMessage("Password must be at least 8 characters"),
	body("confirmPassword")
		.notEmpty()
		.withMessage("Confirm Password is Required")
		.isLength({ min: 8 })
		.withMessage("Confirm Password must be at least 8 characters"),
	body("phone")
		.notEmpty()
		.withMessage("Phone number is Required")
		.isLength({ min: 10, max: 15 })
		.withMessage("Phone number must be between 10 and 15 characters"),
	body("address").notEmpty().withMessage("Address is Required"),
	body("role")
		.optional()
		.isIn(["user", "admin"])
		.withMessage("Role must be either 'user' or 'admin'"),
	body("gender")
		.optional()
		.isIn(["male", "female"])
		.withMessage("Gender must be either 'male' or 'female'"),
	body("status")
		.optional()
		.isIn(["active", "inactive", "banned"])
		.withMessage("Status must be either 'active', 'inactive' or 'banned'"),
];
export const loginSchema = [
	body("email")
		.notEmpty()
		.withMessage("Email is Required")
		.isEmail()
		.withMessage("Email is not valid"),
	body("password")
		.notEmpty()
		.withMessage("Password is Required")
		.isLength({ min: 8 })
		.withMessage("Password must be at least 8 characters"),
];
export const confirmEmailSchema = [
	body("email")
		.notEmpty()
		.withMessage("Email is Required")
		.isEmail()
		.withMessage("Email is not valid"),
	body("otp")
		.notEmpty()
		.withMessage("OTP is Required")
		.isLength({ min: 6, max: 6 })
		.withMessage("OTP must be 6 characters"),
];
export const forgotPasswordSchema = [
	body("email")
		.notEmpty()
		.withMessage("Email is Required")
		.isEmail()
		.withMessage("Email is not valid"),
];
export const resetPasswordSchema = [
	body("email")
		.notEmpty()
		.withMessage("Email is Required")
		.isEmail()
		.withMessage("Email is not valid"),
	body("otp")
		.notEmpty()
		.withMessage("OTP is Required")
		.isLength({ min: 6, max: 6 })
		.withMessage("OTP must be 6 characters"),
	body("newPassword")
		.notEmpty()
		.withMessage("New Password is Required")
		.isLength({ min: 8 })
		.withMessage("New Password must be at least 8 characters"),
	body("confirmPassword")
		.notEmpty()
		.withMessage("Confirm Password is Required")
		.isLength({ min: 8 })
		.withMessage("Confirm Password must be at least 8 characters"),
];
