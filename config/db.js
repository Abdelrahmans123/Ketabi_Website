import mongoose from "mongoose";
import { createClient } from "redis";

export const connectMongoDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("MongoDB Connection Error:", error.message);
        process.exit(1);
    }
};

export const redisClient = createClient({
    url: process.env.REDIS_URL,
});

export const connectRedisDB = async () => {
    try {
        redisClient.on("error", (err) =>
            console.error("Redis Client Error", err)
        );
        await redisClient.connect();
        console.log("Connected to Redis");
    } catch (error) {
        console.error("Redis Connection Error:", error.message);
        process.exit(1);
    }
};

mongoose.connection.on("error", (err) => {
    console.error("MongoDB Runtime Error:", err.message);
    process.exit(1);
});

mongoose.connection.on("disconnected", () => {
    console.error("MongoDB Disconnected - Shutting down server");
    process.exit(1);
});

redisClient.on("error", (err) => {
    console.error("Redis Runtime Error:", err.message);
    process.exit(1);
});
