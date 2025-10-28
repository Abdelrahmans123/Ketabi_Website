import { redisClient } from "../config/db.js";

/**
 
 * @param {string} prefix
 */
export const cacheMiddleware = (prefix) => async (req, res, next) => {
  try {
    const key = `${prefix}:${req.originalUrl}`;

    const cachedData = await redisClient.get(key);
    if (cachedData) {
      console.log("Cache hit:", key);
      return res.status(200).json(JSON.parse(cachedData));
    }

       const originalJson = res.json.bind(res);
    res.json = async (data) => {
   
      await redisClient.setEx(key, 600, JSON.stringify(data));
      console.log("Cached:", key);
      return originalJson(data);
    };

    next();
  } catch (err) {
    console.error("Cache middleware error:", err);
    next(); 
  }
};
