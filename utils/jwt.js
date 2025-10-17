import jsonwebtoken from "jsonwebtoken";
import AppError from "./AppError.js";
export const generateJWT = (user, jwtid) => {
    return jsonwebtoken.sign(
        { id: user._id, role: user.role, name: user.name },
        process.env.JWT_SECRET_KEY,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || "1h",
            jwtid: jwtid,
        }
    );
};
export const verifyJWT = (token) => {
    try {
        return jsonwebtoken.verify(token, process.env.JWT_SECRET_KEY);
    } catch (error) {
        throw new AppError("Invalid or expired token");
    }
};
