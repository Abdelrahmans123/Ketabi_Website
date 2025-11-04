import Joi from "joi";
import { addressValidation } from "./address.js";

export const registerSchema = Joi.object({
    name: Joi.string().min(2).required().messages({
        "string.empty": "Name is Required",
        "string.min": "Name must be at least 3 characters",
    }),

    email: Joi.string().email().required().messages({
        "string.empty": "Email is Required",
        "string.email": "Email is not valid",
    }),

    password: Joi.string().min(8).required().messages({
        "string.empty": "Password is Required",
        "string.min": "Password must be at least 8 characters",
    }),
    confirmPassword: Joi.string()
        .min(8)
        .required()
        .valid(Joi.ref("password"))
        .messages({
            "string.empty": "Confirm Password is Required",
            "string.min": "Confirm Password must be at least 8 characters",
            "any.only": "Passwords do not match",
        }),

    phone: Joi.string().min(10).max(15).required().messages({
        "string.empty": "Phone number is Required",
        "string.min": "Phone number must be between 10 and 15 characters",
        "string.max": "Phone number must be between 10 and 15 characters",
    }),

    address: addressValidation,

    role: Joi.string().valid("user", "admin").optional().messages({
        "any.only": "Role must be either 'user' or 'admin'",
    }),

    gender: Joi.string().valid("male", "female").optional().messages({
        "any.only": "Gender must be either 'male' or 'female'",
    }),

    status: Joi.string().valid("active", "inactive").optional().messages({
        "any.only": "Status must be either 'active' or 'inactive'",
    }),
    telegramChatId: Joi.string().optional(),
});
export const loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
        "string.empty": "Email is Required",
        "string.email": "Email is not valid",
    }),
    password: Joi.string().min(8).required().messages({
        "string.empty": "Password is Required",
        "string.min": "Password must be at least 8 characters",
    }),
});
export const confirmEmailSchema = Joi.object({
    otp: Joi.string().length(6).required().messages({
        "string.empty": "OTP is Required",
        "string.length": "OTP must be 6 characters",
    }),
});
export const forgotPasswordSchema = Joi.object({
    email: Joi.string().email().required().messages({
        "string.empty": "Email is Required",
        "string.email": "Email is not valid",
    }),
});
export const resetPasswordSchema = Joi.object({
    otp: Joi.string().length(6).required().messages({
        "string.empty": "OTP is Required",
        "string.length": "OTP must be 6 characters",
    }),
    newPassword: Joi.string().min(8).required().messages({
        "string.empty": "Password is Required",
        "string.min": "Password must be at least 8 characters",
    }),
    confirmPassword: Joi.string()
        .min(8)
        .required()
        .valid(Joi.ref("newPassword"))
        .messages({
            "string.empty": "Confirm Password is Required",
            "string.min": "Confirm Password must be at least 8 characters",
            "any.only": "Passwords do not match",
        }),
});
