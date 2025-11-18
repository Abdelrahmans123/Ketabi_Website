import { redisClient } from "../config/db.js";
import { buildCacheKey } from "../utils/cacheKeyBuilder.js";

export const cacheMiddleware = (prefix, { ttl = 300, skipParams = [] } = {}) => async (req, res, next) => {
  try {
    // Include both query params and route params in cache key
    const query = { ...req.query, ...req.params };
    skipParams.forEach(p => delete query[p]);
    const cacheKey = buildCacheKey(prefix, query);

    const cached = await redisClient.get(cacheKey);
    if (cached) return res.status(200).json(JSON.parse(cached));

    if (query.maxPrice) {
      const fallbackKey = buildCacheKey(prefix, { ...query, maxPrice: undefined });
      const fallback = await redisClient.get(fallbackKey);
      if (fallback) {
        const parsed = JSON.parse(fallback);
        const filtered = parsed.data.books.filter(b => b.price <= query.maxPrice);
        const result = { status: "success", data: { ...parsed.data, books: filtered } };
        await redisClient.setEx(cacheKey, ttl, JSON.stringify(result));
        return res.status(200).json(result);
      }
    }

    const sendJson = res.json.bind(res);
    res.json = async (data) => {
      if (res.statusCode === 200 && data.status === "success") {
        await redisClient.setEx(cacheKey, ttl, JSON.stringify(data));
      }
      return sendJson(data);
    };

    next();
  } catch (err) {
    console.error("Cache middleware error:", err);
    next();
  }
};

export const invalidateCache = async (patterns = []) => {
  try {
    const keys = await redisClient.keys("*");
    const targets = keys.filter(k => patterns.some(p => k.includes(p)));
    if (!targets.length) return;
    await redisClient.del(targets);
    console.log(` Invalidated ${targets.length} cache entries`);
  } catch (err) {
    console.error("Cache invalidation error:", err);
  }
};
