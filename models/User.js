import mongoose from "mongoose";
import { genderEnum } from "../utils/genderEnum.js";
import { roleEnum } from "../utils/roleEnum.js";
import { providerEnum } from "../utils/providerEnum.js";

const addressSchema = new mongoose.Schema(
    {
        street: String,
        city: String,
    },
    { _id: false }
);

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: true,
        },
        phone: {
            type: String,
            required: true,
            unique: true,
        },
        address: [addressSchema],
        role: {
            type: String,
            enum: Object.values(roleEnum),
            default: roleEnum.user,
        },
        gender: {
            type: String,
            enum: Object.values(genderEnum),
            required: true,
        },
        confirmEmail: Date,
        confirmEmailOtp: {
            type: String,
        },
        confirmEmailOtpExpires: Date,
        resetPasswordOtp: {
            type: String,
        },
        resetPasswordOtpExpires: Date,
        isEmailConfirmed: {
            type: Boolean,
            default: false,
        },
        avatar: {
            public_id: String,
            url: String,
        },
        status: {
            type: String,
            enum: ["active", "inactive", "banned"],
            default: "active",
        },
        changeCredentialTime: Date,
        isTwoFactorEnabled: {
            type: Boolean,
            default: true,
        },
        isTwoFactorAuthenticated: {
            type: Boolean,
            default: false,
        },
        twoFactorOtp: String,
        twoFactorOtpExpires: Date,
        lastLoginAt: { type: Date, default: null },
        library: [{ type: mongoose.Schema.Types.ObjectId, ref: "Book" }],
        purchasedBooks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Book" }],
        booksPublished: [{ type: mongoose.Schema.Types.ObjectId, ref: "Book" }],
        twoFactorOtpAttempts: { type: Number, default: 0 },
        provider: {
            type: String,
            enum: Object.values(providerEnum),
            default: providerEnum.SYSTEM,
        },
        isFirstLogin: {
            type: Boolean,
            default: false,
        },
        wishlist: [
            {
                book: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Book",
                },
                addedDate: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],

        refreshToken: {
            type: String,
            default: null,
        },
        refreshTokenExpiresAt: {
            type: Date,
            default: null,
        },
        phoneOtp: { type: String, default: null },
        phoneOtpExpires: { type: Date, default: null },
        phoneOtpAttempts: { type: Number, default: 0 },
        isPhoneVerified: { type: Boolean, default: false },
        phoneVerifiedAt: { type: Date, default: null },
        telegramChatId: {
            type: String,
            required: false,
            index: true,
        },
        telegramUsername: {
            type: String,
            required: false,
        },
    },

    { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
