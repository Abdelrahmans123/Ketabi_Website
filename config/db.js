import mongoose from "mongoose";
import { createClient } from "redis";
import asyncHandler from "../utils/asyncHandler.js";
export const connectMongoDB = asyncHandler(async () => {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");
});
export const redisClient = createClient({
    url: process.env.REDIS_URL,
});
export const connectRedisDB = asyncHandler(async () => {
        redisClient.on("error", (err) =>
            console.error("Redis Client Error", err)
        );
        await redisClient.connect();
        console.log("Connected to Redis");
});
