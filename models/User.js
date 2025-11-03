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
            required: true,
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
        wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Book" }],
    },

    { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
