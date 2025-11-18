import { redisClient } from "../config/db.js";

export const cacheData = async (key, data, ttl = 300) => {
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(data));
    console.log(`Cached: ${key}`);
  } catch (err) {
    console.warn("Cache write error:", err.message);
  }
};

export const getCachedData = async (key) => {
  try {
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (err) {
    console.warn("Cache read error:", err.message);
    return null;
  }
};

export const isCached = async (key) => {
  try {
    return Boolean(await redisClient.exists(key));
  } catch {
    return false;
  }
};
