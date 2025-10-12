import mongoose from "mongoose";
import { createClient } from "redis";
export const connectMongoDB = async () => {
	try {
		await mongoose.connect(process.env.MONGO_URI);
		console.log("Connected to MongoDB");
	} catch (error) {
		console.error("MongoDB connection error:", error);
	}
};
export const redisClient = createClient({
	url: process.env.REDIS_URL,
});
export const connectRedisDB = async () => {
	try {
		redisClient.on("error", (err) => console.error("Redis Client Error", err));
		await redisClient.connect();
		console.log("Connected to Redis");
	} catch (error) {
		console.error("Redis connection error:", error);
	}
};
