import { create, findById, findOne, updateOne } from "../models/services/db.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { compareHash, encrypt, generateHash } from "../utils/security.js";
import { successResponse } from "../utils/successResponse.js";
import { nanoid } from "nanoid";
import { sendEmail } from "./../utils/sendEmail.js";
import asyncHandler from "../utils/asyncHandler.js";
import { generateJWT } from "../utils/jwt.js";
import { redisClient } from "../config/db.js";
import { generateOTP } from "../utils/generateOTP.js";

export const register = asyncHandler(async (req, res, next) => {
    const { name, email, password, phone, address, gender } = req.body;
    const existingUser = await findOne(User, { email });
    if (existingUser) {
        const error = AppError.create("User already exists", 400);
        return next(error);
    }
    if (password !== req.body.confirmPassword) {
        const error = AppError.create("Passwords do not match", 400);
        return next(error);
    }
    const hashedPassword = generateHash({ plainText: password });
    const encryptedPhone = encrypt({
        plainText: phone,
        secretKey: process.env.ENCRYPTION_KEY,
    });
    const otp = generateOTP();
    const otpHash = generateHash({ plainText: otp });
    const otpExpiry = Date.now() + 10 * 60 * 1000;
    const newUser = await create(User, {
        name,
        email,
        password: hashedPassword,
        phone: encryptedPhone,
        address,
        gender,
        confirmEmailOtp: otpHash,
        confirmEmailOtpExpires: otpExpiry,
    });
    await sendEmail({
        to: email,
        subject: "Welcome to Our App - Confirm Your Email",
        text: `Your OTP is ${otp}. Please use it to confirm your email.`,
    });
    req.session.userId = newUser._id;
    return successResponse({
        res,
        statusCode: 201,
        message: "User registered successfully. Check your email for OTP.",
        data: {
            name: newUser.name,
            email: newUser.email,
        },
    });
});
export const confirmEmail = asyncHandler(async (req, res, next) => {
    const { otp } = req.body;
    const userId = req.session.userId;
    if (!userId) {
        const error = AppError.create(
            "Session expired, please login again",
            401
        );
        return next(error);
    }
    const user = await findById(User, userId);
    if (!user) {
        const error = AppError.create("User not found", 404);
        return next(error);
    }
    if (user.isEmailConfirmed) {
        const error = AppError.create("Email already confirmed", 400);
        return next(error);
    }
    if (Date.now() > user.confirmEmailOtpExpires) {
        const error = AppError.create("OTP has expired", 400);
        return next(error);
    }
    const isOtpValid = compareHash({
        plainText: otp,
        hash: user.confirmEmailOtp,
    });
    if (!isOtpValid) {
        const error = AppError.create("Invalid OTP", 400);
        return next(error);
    }
    await updateOne(
        User,
        { _id: user._id },
        {
            isEmailConfirmed: true,
            confirmEmail: new Date(),
            confirmEmailOtp: null,
            confirmEmailOtpExpires: null,
        }
    );
    return successResponse({
        res,
        statusCode: 200,
        message: "Email confirmed successfully",
    });
});
export const login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;
    const user = await findOne(User, { email });
    if (!user) {
        const error = AppError.create("Invalid Credentials", 401);
        return next(error);
    }
    const isPasswordValid = compareHash({
        plainText: password,
        hash: user.password,
    });
    if (!isPasswordValid) {
        const error = AppError.create("Invalid Credentials", 401);
        return next(error);
    }
    if (!user.isEmailConfirmed) {
        const error = AppError.create(
            "Please confirm your email to login",
            401
        );
        return next(error);
    }

    const otp = generateOTP();
    const otpHash = generateHash({ plainText: otp });
    const otpExpiry = Date.now() + 10 * 60 * 1000;
    await updateOne(
        User,
        { _id: user._id },
        { twoFactorOtp: otpHash, twoFactorOtpExpires: otpExpiry }
    );
    await sendEmail({
        to: email,
        subject: "Your Login OTP",
        text: `Your OTP is ${otp}. Please use it to complete your login.`,
    });
    req.session.userId = user._id;
    return successResponse({
        res,
        statusCode: 200,
        message: "OTP sent to your email",
    });
});

export const confirmLogin = asyncHandler(async (req, res, next) => {
    const userId = req.session.userId;
    if (!userId) {
        const error = AppError.create(
            "Session expired, please login again",
            401
        );
        return next(error);
    }
    const user = await findById(User, userId);
    const { otp } = req.body;
    if (!user) {
        const error = AppError.create("User not found", 404);
        return next(error);
    }
    if (Date.now() > user.twoFactorOtpExpires) {
        const error = AppError.create("OTP has expired", 400);
        return next(error);
    }
    const isOtpValid = compareHash({
        plainText: otp,
        hash: user.twoFactorOtp,
    });
    if (!isOtpValid) {
        const error = AppError.create("Invalid OTP", 400);
        return next(error);
    }
    await updateOne(
        User,
        { _id: user._id },
        {
            twoFactorOtp: null,
            twoFactorOtpExpires: null,
            isTwoFactorAuthenticated: true,
        }
    );
    const jwtId = nanoid().toString();
    const accessToken = generateJWT(user, "1h", jwtId);
    await redisClient.hSet(`token:${jwtId}`, { userId: user._id.toString() });
    const oneHourInSeconds = 60 * 60;
    await redisClient.expire(`token:${jwtId}`, oneHourInSeconds);
    return successResponse({
        res,
        statusCode: 200,
        message: "Login successful",
        data: {
            accessToken,
        },
    });
});
export const forgotPassword = asyncHandler(async (req, res, next) => {
    const { email } = req.body;
    const user = await findOne(User, { email });
    req.session.userId = user?._id;
    if (!req.session.userId) {
        const error = AppError.create("Session expired, please try again", 401);
        return next(error);
    }
    if (!user) {
        const error = AppError.create("User not found", 404);
        return next(error);
    }
    const otp = generateOTP();
    const otpHash = generateHash({ plainText: otp });
    const otpExpiry = Date.now() + 10 * 60 * 1000;
    await updateOne(
        User,
        { _id: user._id },
        { resetPasswordOtp: otpHash, resetPasswordOtpExpires: otpExpiry }
    );
    await sendEmail({
        to: email,
        subject: "Reset Your Password",
        text: `Your OTP is ${otp}. Please use it to reset your password.`,
    });
    return successResponse({
        res,
        statusCode: 200,
        message: "OTP sent to your email",
    });
});
export const resetPassword = asyncHandler(async (req, res, next) => {
    const { otp, newPassword } = req.body;

    const userId = req.session.userId;
    const user = await findById(User, userId);
    if (!user) {
        const error = AppError.create("User not found", 404);
        return next(error);
    }
    if (Date.now() > user.resetPasswordOtpExpires) {
        const error = AppError.create("OTP has expired", 400);
        return next(error);
    }
    const isOtpValid = compareHash({
        plainText: otp,
        hash: user.resetPasswordOtp,
    });
    if (!isOtpValid) {
        const error = AppError.create("Invalid OTP", 400);
        return next(error);
    }
    const hashedPassword = generateHash({ plainText: newPassword });
    await updateOne(User, { _id: user._id }, { password: hashedPassword });
    return successResponse({
        res,
        statusCode: 200,
        message: "Password reset successfully",
    });
});
export const logout = asyncHandler(async (req, res, next) => {
    const { flag } = req.body;
    switch (flag) {
        case "all":
            await updateOne(
                User,
                { _id: req.user.id },
                { $set: { changeCredentialTime: new Date() } }
            );
            break;
        default:
            await redisClient.del(`token:${req.user.jti}`);
            break;
    }

    return successResponse({
        res,
        statusCode: 200,
        message: "Logged out successfully",
    });
});
