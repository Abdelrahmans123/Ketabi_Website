import dotenv from 'dotenv';
import { redisClient } from "../../config/db.js";

dotenv.config();

const CACHE_TTL = {
  embedding: 86400,
  search: 3600,
  aiResponse: 1800,
};

function generateCacheKey(prefix, data) {
  const hash = Buffer.from(JSON.stringify(data)).toString('base64').substring(0, 32);
  return `${prefix}:${hash}`;
}

export async function getFromCache(prefix, key) {
  try {
    if (!redisClient.isOpen) return null;

    const cacheKey = generateCacheKey(prefix, key);
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      console.log(`Cache HIT: ${cacheKey}`);
      return JSON.parse(cached);
    }

    console.log(`Cache MISS: ${cacheKey}`);
    return null;
  } catch (error) {
    console.error('Cache get error:', error.message);
    return null;
  }
}

export async function saveToCache(prefix, key, value, ttl) {
  try {
    if (!redisClient.isOpen) return false;

    const cacheKey = generateCacheKey(prefix, key);
    const cacheTTL = ttl || CACHE_TTL[prefix] || 3600;

    await redisClient.setEx(cacheKey, cacheTTL, JSON.stringify(value));
    console.log(`Cached: ${cacheKey} (TTL: ${cacheTTL}s)`);
    return true;

  } catch (error) {
    console.error('Cache set error:', error.message);
    return false;
  }
}


