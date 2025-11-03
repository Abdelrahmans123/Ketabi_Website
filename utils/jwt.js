import jsonwebtoken from "jsonwebtoken";
import AppError from "./AppError.js";
export const generateAccessToken = (user, jwtid) => {
    return jsonwebtoken.sign(
        { id: user._id, role: user.role, name: user.name },
        process.env.JWT_SECRET_ACCESS_KEY,
        {
            expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "1h",
            jwtid: jwtid,
        }
    );
};
export const verifyAccessToken = (token) => {
    try {
        return jsonwebtoken.verify(token, process.env.JWT_SECRET_ACCESS_KEY);
    } catch (error) {
        throw new AppError("Invalid or expired token");
    }
};
export const generateRefreshToken = (user, jwtid) => {
    return jsonwebtoken.sign(
        { id: user._id, role: user.role, name: user.name },
        process.env.JWT_SECRET_REFRESH_KEY,
        {
            expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
            jwtid: jwtid,
        }
    );
};
export const verifyRefreshToken = (token) => {
    try {
        return jsonwebtoken.verify(token, process.env.JWT_SECRET_REFRESH_KEY);
    } catch (error) {
        throw new AppError("Invalid or expired token");
    }
};
