import {
    create,
    findAll,
    findById,
    findOne,
    updateOne,
} from "../models/services/db.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { compareHash, encrypt, generateHash } from "../utils/security.js";
import { successResponse } from "../utils/successResponse.js";
import { nanoid } from "nanoid";
import { sendEmail } from "./../utils/sendEmail.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
} from "../utils/jwt.js";
import { redisClient } from "../config/db.js";
import { generateOTP } from "../utils/generateOTP.js";
import { OAuth2Client } from "google-auth-library";
import { providerEnum } from "../utils/providerEnum.js";
import fetch from "node-fetch";
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
export const register = asyncHandler(async (req, res, next) => {
    const { name, email, password, phone, address, gender, role } = req.body;
    const existingUser = await findOne({ model: User, query: { email } });
    if (existingUser) {
        const error = new AppError("User already exists", 400);
        return next(error);
    }
    const hashedPassword = generateHash({ plainText: password });
    const encryptedPhone = encrypt({
        plainText: phone,
        secretKey: process.env.ENCRYPTION_KEY,
    });
    const isPhoneExists = await findAll({
        model: User,
        filter: { phone: encryptedPhone },
    });
    if (isPhoneExists) {
        const error = new AppError("Phone number already in use", 400);
        return next(error);
    }
    const otp = generateOTP();
    const otpHash = generateHash({ plainText: otp });
    const otpExpiry = Date.now() + 10 * 60 * 1000;
    const newUser = await create({
        model: User,
        data: {
            name,
            email,
            password: hashedPassword,
            phone: encryptedPhone,
            address: Array.isArray(address) ? address : [address],
            gender,
            role,
            confirmEmailOtp: otpHash,
            confirmEmailOtpExpires: otpExpiry,
            isFirstLogin: true,
        },
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
    });
});
export const registerWithGoogle = asyncHandler(async (req, res, next) => {
    const { idToken, name, photoUrl } = req.body;
    const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const verifiedEmail = payload.email;

    if (!payload.email_verified) {
        return next(new AppError("Email not verified by Google", 400));
    }
    const existingUser = await findOne(User, { email: verifiedEmail });

    if (existingUser) {
        return next(new AppError("User already exists, please login", 409));
    }
    const data = {
        name: name || payload.name,
        email: verifiedEmail,
        password: generateHash({ plainText: nanoid() }),
        phone: encrypt({
            plainText: "Google_OAuth_User",
            secretKey: process.env.ENCRYPTION_KEY,
        }),
        provider: providerEnum.GOOGLE,
        isEmailConfirmed: true,
        avatar: {
            public_id: `google_${nanoid()}`,
            url: photoUrl || payload.picture,
        },
        isTwoFactorAuthenticated: true,
    };
    const user = await create({ model: User, data });
    const jwtId = nanoid().toString();
    const accessToken = generateAccessToken(user, jwtId);
    const refreshToken = generateRefreshToken(user, jwtId);
    await redisClient.hSet(`token:${jwtId}`, {
        userId: user._id.toString(),
        twoFactorVerified: "true",
    });
    await redisClient.expire(`token:${jwtId}`, 60 * 60);
    await redisClient.set(`user:${user._id}:activeToken`, jwtId);

    return successResponse({
        res,
        statusCode: 201,
        message: "User registered successfully",
        data: {
            accessToken,
            refreshToken,
        },
    });
});

export const googleLogin = asyncHandler(async (req, res, next) => {
    const { idToken } = req.body;
    const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;

    if (!payload.email_verified) {
        return next(new AppError("Email not verified by Google", 400));
    }
    const user = await findOne({ model: User, query: { email } });

    if (!user) {
        return next(new AppError("User not found", 404));
    }
    if (user.provider !== providerEnum.GOOGLE) {
        return next(new AppError("Please use email/password login", 400));
    }
    const jwtId = nanoid().toString();

    const oldTokenKey = await redisClient.get(`user:${user._id}:activeToken`);
    if (oldTokenKey) {
        await redisClient.del(`token:${oldTokenKey}`);
    }

    const accessToken = generateAccessToken(user, jwtId);
    const refreshToken = generateRefreshToken(user, jwtId);
    await redisClient.hSet(`token:${jwtId}`, {
        userId: user._id.toString(),
        twoFactorVerified: "true",
    });
    await redisClient.expire(`token:${jwtId}`, 60 * 60);
    await redisClient.set(`user:${user._id}:activeToken`, jwtId);

    return successResponse({
        res,
        statusCode: 200,
        message: "Login successful",
        data: {
            accessToken,
            refreshToken,
        },
    });
});
export const facebookLogin = asyncHandler(async (req, res, next) => {
    const { accessToken } = req.body;
    const fbResponse = await fetch(
        `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`
    );
    const fbData = await fbResponse.json();
    if (!fbData.email) {
        return next(new AppError("Unable to get email from Facebook", 400));
    }
    const user = await findOne({ model: User, query: { email: fbData.email } });

    if (!user) {
        return next(new AppError("User not found", 404));
    }
    if (user.provider !== providerEnum.FACEBOOK) {
        return next(new AppError("Please use email/password login", 400));
    }
    const jwtId = nanoid().toString();
    const oldTokenKey = await redisClient.get(`user:${user._id}:activeToken`);
    if (oldTokenKey) {
        await redisClient.del(`token:${oldTokenKey}`);
    }
    const token = generateAccessToken(user, jwtId);
    const refreshToken = generateRefreshToken(user, jwtId);
    await redisClient.hSet(`token:${jwtId}`, {
        userId: user._id.toString(),
        twoFactorVerified: "true",
    });
    await redisClient.expire(`token:${jwtId}`, 60 * 60);
    await redisClient.set(`user:${user._id}:activeToken`, jwtId);

    return successResponse({
        res,
        statusCode: 200,
        message: "Login successful",
        data: {
            accessToken: token,
            refreshToken,
        },
    });
});

export const registerWithFacebook = asyncHandler(async (req, res, next) => {
    const { accessToken, email, name, photoUrl } = req.body;
    const fbResponse = await fetch(
        `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`
    );

    const fbData = await fbResponse.json();

    if (fbData.error) {
        return next(new AppError("Invalid Facebook token", 400));
    }

    const verifiedEmail = fbData.email || email;

    if (!verifiedEmail) {
        return next(new AppError("Email is required", 400));
    }

    const existingUser = await findOne({
        model: User,
        query: { email: verifiedEmail },
    });

    if (existingUser) {
        return next(new AppError("User already exists, please login", 409));
    }
    const data = {
        name: name || fbData.name,
        email: verifiedEmail,
        password: generateHash({ plainText: nanoid() }),
        phone: encrypt({
            plainText: "Facebook_OAuth_User",
            secretKey: process.env.ENCRYPTION_KEY,
        }),
        provider: providerEnum.FACEBOOK,
        isEmailConfirmed: true,
        confirmEmailOtp: null,
        confirmEmailOtpExpires: null,
        avatar: {
            public_id: `facebook_${nanoid()}`,
            url: photoUrl || fbData.picture?.data?.url,
        },
        isTwoFactorAuthenticated: true,
        role: "user",
    };
    const user = await create({ model: User, data });
    const jwtId = nanoid().toString();
    const token = generateAccessToken(user, jwtId);
    const refreshToken = generateRefreshToken(user, jwtId);
    await redisClient.hSet(`token:${jwtId}`, {
        userId: user._id.toString(),
        twoFactorVerified: "true",
    });
    await redisClient.expire(`token:${jwtId}`, 60 * 60);
    await redisClient.set(`user:${user._id}:activeToken`, jwtId);

    return successResponse({
        res,
        statusCode: 201,
        message: "User registered successfully",
        data: {
            accessToken: token,
            refreshToken,
        },
    });
});
export const confirmEmail = asyncHandler(async (req, res, next) => {
    const { otp } = req.body;
    const userId = req.session.userId;
    if (!userId) {
        const error = new AppError("Session expired, please login again", 401);
        return next(error);
    }
    const user = await findById({ model: User, id: userId });
    if (!user) {
        const error = new AppError("User not found", 404);
        return next(error);
    }
    if (user.isEmailConfirmed) {
        const error = new AppError("Email already confirmed", 400);
        return next(error);
    }
    if (Date.now() > user.confirmEmailOtpExpires) {
        const error = new AppError("OTP has expired", 400);
        return next(error);
    }
    const isOtpValid = compareHash({
        plainText: otp,
        hash: user.confirmEmailOtp,
    });
    if (!isOtpValid) {
        const error = new AppError("Invalid OTP", 400);
        return next(error);
    }
    const data = {
        isEmailConfirmed: true,
        confirmEmail: new Date(),
        confirmEmailOtp: null,
        confirmEmailOtpExpires: null,
    };
    await updateOne({ model: User, query: { _id: user._id }, data });
    return successResponse({
        res,
        statusCode: 200,
        message: "Email confirmed successfully",
    });
});
export const login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;
    const user = await findOne({ model: User, query: { email } });
    if (!user) {
        const error = new AppError("Invalid Credentials", 401);
        return next(error);
    }
    const isPasswordValid = compareHash({
        plainText: password,
        hash: user.password,
    });
    if (!isPasswordValid) {
        const error = new AppError("Invalid Credentials", 401);
        return next(error);
    }
    if (!user.isEmailConfirmed) {
        const error = new AppError("Please confirm your email to login", 401);
        return next(error);
    }
    if (user.isFirstLogin) {
        const jwtId = nanoid().toString();
        const oldTokenKey = await redisClient.get(
            `user:${user._id}:activeToken`
        );
        if (oldTokenKey) {
            await redisClient.del(`token:${oldTokenKey}`);
        }
        const accessToken = generateAccessToken(user, jwtId);
        const refreshToken = generateRefreshToken(user, jwtId);
        await redisClient.hSet(`token:${jwtId}`, {
            userId: user._id.toString(),
            twoFactorVerified: "true",
        });
        await redisClient.expire(`token:${jwtId}`, 60 * 60);
        await redisClient.set(`user:${user._id}:activeToken`, jwtId);
        await updateOne({
            model: User,
            query: { _id: user._id },
            data: {
                isFirstLogin: false,
                refreshToken: refreshToken,
                refreshTokenExpiresAt: new Date(
                    Date.now() + 7 * 24 * 60 * 60 * 1000
                ),
            },
        });
        return successResponse({
            res,
            statusCode: 200,
            message: "Login successful",
            data: {
                accessToken,
                refreshToken,
            },
        });
    }
    const otp = generateOTP();
    const otpHash = generateHash({ plainText: otp });
    const otpExpiry = Date.now() + 10 * 60 * 1000 * 10000;
    await updateOne({
        model: User,
        query: { _id: user._id },
        data: {
            twoFactorOtp: otpHash,
            twoFactorOtpExpires: otpExpiry,
            twoFactorOtpAttempts: 0,
        },
    });
    req.session.userId = user._id;
    req.session.isAuthenticated = false;
    req.session.otpPurpose = "login";
    req.session.otpIssuedAt = Date.now();
    await sendEmail({
        to: email,
        subject: "Your Login OTP",
        text: `Your OTP is ${otp}. Please use it to complete your login.`,
    });
    return successResponse({
        res,
        statusCode: 200,
        message: "OTP sent to your email",
    });
});

export const confirmLogin = asyncHandler(async (req, res, next) => {
    const userId = req.session.userId;
    if (!userId || req.session.otpPurpose !== "login") {
        return next(new AppError("Session expired or invalid flow", 401));
    }
    const user = await findById({ model: User, id: userId });
    const { otp } = req.body;
    if (!user) {
        const error = new AppError("User not found", 404);
        return next(error);
    }
    if (Date.now() > user.twoFactorOtpExpires) {
        const error = new AppError("OTP has expired", 400);
        return next(error);
    }
    if (user.twoFactorOtpAttempts >= 5) {
        return next(
            new AppError("Too many invalid attempts, account locked", 403)
        );
    }
    const isOtpValid = compareHash({
        plainText: otp,
        hash: user.twoFactorOtp,
    });
    if (!isOtpValid) {
        await updateOne({
            model: User,
            query: { _id: user._id },
            data: { $inc: { twoFactorOtpAttempts: 1 } },
        });
        return next(new AppError("Invalid OTP", 400));
    }
    const lastLoginAt = new Date();
    const data = {
        twoFactorOtp: null,
        twoFactorOtpExpires: null,
        twoFactorOtpAttempts: 0,
        isTwoFactorAuthenticated: true,
        lastLoginAt,
    };
    await updateOne({ model: User, query: { _id: user._id }, data });
    const jwtId = nanoid().toString();
    const oldTokenKey = await redisClient.get(`user:${user._id}:activeToken`);
    if (oldTokenKey) {
        await redisClient.del(`token:${oldTokenKey}`);
    }
    const accessToken = generateAccessToken(user, jwtId);
    const refreshToken = generateRefreshToken(user, jwtId);
    await redisClient.hSet(`token:${jwtId}`, {
        userId: user._id.toString(),
        twoFactorVerified: "true",
    });

    const oneHourInSeconds = 60 * 60;
    await redisClient.expire(`token:${jwtId}`, oneHourInSeconds);
    req.session.isAuthenticated = true;
    req.session.otpPurpose = null;
    await redisClient.hSet(`token:${jwtId}`, { userId: user._id.toString() });
    await redisClient.expire(`token:${jwtId}`, 60 * 60);
    await redisClient.set(`user:${user._id}:activeToken`, jwtId);
    return successResponse({
        res,
        statusCode: 200,
        message: "Login successful",
        data: {
            accessToken,
            refreshToken,
        },
    });
});
export const forgotPassword = asyncHandler(async (req, res, next) => {
    const { email } = req.body;
    const user = await findOne({ model: User, query: { email } });
    if (!user) {
        const error = new AppError("User not found", 404);
        return next(error);
    }
    const otp = generateOTP();
    const otpHash = generateHash({ plainText: otp });
    const otpExpiry = Date.now() + 10 * 60 * 1000;
    const data = {
        resetPasswordOtp: otpHash,
        resetPasswordOtpExpires: otpExpiry,
    };
    await updateOne({ model: User, query: { _id: user._id }, data });
    await sendEmail({
        to: email,
        subject: "Reset Your Password",
        text: `Your OTP is ${otp}. Please use it to reset your password.`,
    });
    console.log("OTP", otp);

    return successResponse({
        res,
        statusCode: 200,
        message: "OTP sent to your email",
    });
});
export const resetPassword = asyncHandler(async (req, res, next) => {
    const { otp, newPassword } = req.body;
    const userId = req.session.userId;
    const user = await findById({ model: User, id: userId });
    if (!user) {
        const error = new AppError("User not found", 404);
        return next(error);
    }
    if (Date.now() > user.resetPasswordOtpExpires) {
        const error = new AppError("OTP has expired", 400);
        return next(error);
    }
    const isOtpValid = compareHash({
        plainText: otp,
        hash: user.resetPasswordOtp,
    });
    if (!isOtpValid) {
        const error = new AppError("Invalid OTP", 400);
        return next(error);
    }
    const hashedPassword = generateHash({ plainText: newPassword });
    await updateOne({
        model: User,
        query: { _id: user._id },
        data: {
            password: hashedPassword,
            resetPasswordOtp: null,
            resetPasswordOtpExpires: null,
        },
    });
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
            const activeJti = await redisClient.get(
                `user:${req.user.id}:activeToken`
            );
            if (activeJti) {
                await redisClient.del(`token:${activeJti}`);
                await redisClient.del(`user:${req.user.id}:activeToken`);
            }
            await updateOne({
                model: User,
                query: { _id: req.user.id },
                data: {
                    changeCredentialTime: new Date(),
                    refreshToken: null,
                    refreshTokenExpiresAt: null,
                },
            });
            break;
        default:
            await redisClient.del(`token:${req.user.jti}`);
            const storedJti = await redisClient.get(
                `user:${req.user.id}:activeToken`
            );
            if (storedJti === req.user.jti) {
                await redisClient.del(`user:${req.user.id}:activeToken`);
            }
            await updateOne({
                model: User,
                query: { _id: req.user.id },
                data: {
                    refreshToken: null,
                    refreshTokenExpiresAt: null,
                },
            });
    }

    return successResponse({
        res,
        statusCode: 200,
        message: "Logged out successfully",
    });
});
export const resendConfirmationOtp = asyncHandler(async (req, res, next) => {
    const userId = req.session.userId;
    const user = await findById({ model: User, id: userId });
    if (!user) {
        return next(new AppError("User not found", 404));
    }
    if (user.isEmailConfirmed) {
        return next(new AppError("Email already confirmed", 400));
    }
    const otp = generateOTP();
    const otpHash = generateHash({ plainText: otp });
    const otpExpiry = Date.now() + 10 * 60 * 1000;
    await updateOne({
        model: User,
        query: { _id: user._id },
        data: { confirmEmailOtp: otpHash, confirmEmailOtpExpires: otpExpiry },
    });
    await sendEmail({
        to: email,
        subject: "Confirm Your Email - New OTP",
        text: `Your new OTP is ${otp}. Please use it to confirm your email.`,
    });
    req.session.userId = user._id;
    return successResponse({
        res,
        statusCode: 200,
        message: "New OTP sent to your email",
    });
});
export const refreshAccessToken = asyncHandler(async (req, res, next) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return next(new AppError("Refresh token is required", 400));
    }
    let decoded;
    try {
        decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
        return next(new AppError("Invalid or expired refresh token", 401));
    }
    const user = await findById({ model: User, id: decoded.id });
    if (!user) {
        return next(new AppError("User not found", 404));
    }
    if (user.refreshToken !== refreshToken) {
        return next(new AppError("Invalid refresh token", 401));
    }
    if (new Date() > user.refreshTokenExpiresAt) {
        return next(new AppError("Refresh token expired", 401));
    }
    const newAccessToken = generateAccessToken(user, decoded.jti);
    const newRefreshToken = generateRefreshToken(user, decoded.jti);
    await updateOne({
        model: User,
        query: { _id: user._id },
        data: {
            refreshToken: newRefreshToken,
            refreshTokenExpiresAt: new Date(
                Date.now() + 7 * 24 * 60 * 60 * 1000
            ),
        },
    });
    await redisClient.expire(`token:${decoded.jti}`, 60 * 60);
    return successResponse({
        res,
        statusCode: 200,
        message: "Token refreshed successfully",
        data: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        },
    });
});
