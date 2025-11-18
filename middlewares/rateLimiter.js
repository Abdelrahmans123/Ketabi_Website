import { rateLimit } from "express-rate-limit";
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000 ,
    limit: 1000,
    message: "Too many requests from this IP, please try again later.",
});
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Too many requests, please try again later.",
});
