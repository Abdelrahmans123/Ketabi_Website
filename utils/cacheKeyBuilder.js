export const buildCacheKey = (prefix, query = {}) => {
  const clean = Object.entries(query)
    .filter(([_, v]) => v != null && v !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  return `${prefix}:${clean || "default"}`;
};

export const getPaginationCacheKey = (prefix, skip = 0, limit = 12) =>
  buildCacheKey(prefix, { limit, skip, sort: "-createdAt" });

export const getCategoryCacheKey = (category) =>
  buildCacheKey("category", { name: category });

export const getFiltersCacheKey = () => "filters:default";
