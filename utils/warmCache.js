import Book from "../models/Book.js";
import Genre from "../models/Genre.js";
import { cacheData, isCached } from "./cacheHelper.js";
import { getPaginationCacheKey, getCategoryCacheKey, getFiltersCacheKey } from "./cacheKeyBuilder.js";

const log = console.log;

const cachePages = async () => {
  log(" Pre-loading first 5 pages...");
  const limit = 12;

  for (let page = 0; page < 5; page++) {
    const skip = page * limit;
    const cacheKey = getPaginationCacheKey("books", skip, limit);
    if (await isCached(cacheKey)) continue;

    const [books, total] = await Promise.all([
      Book.find({ status: "in stock" })
        .populate("genre", "name")
        .select("-pdf")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Book.countDocuments({ status: "in stock" })
    ]);

    await cacheData(cacheKey, {
      status: "success",
      data: { books, pagination: { total, limit, skip, page: page + 1, hasMore: skip + limit < total } }
    }, 600);
  }
  log(" Pages cached!");
};

const cacheCategories = async () => {
  log("\nPre-loading categories...");
  const categories = {
    arabic: { bookLanguage: "arabic" },
    english: { bookLanguage: "english" },
    kids: { recommendedAge: "kids" },
    new: {}
  };

  for (const [category, filter] of Object.entries(categories)) {
    const cacheKey = getCategoryCacheKey(category);
    if (await isCached(cacheKey)) continue;

    const books = await Book.find({ status: "in stock", ...filter })
      .select("-pdf")
      .sort({ createdAt: -1 })
      .limit(12)
      .lean();

    await cacheData(cacheKey, { status: "success", data: { books, category } }, 3600);
  }
  log(" Categories cached!");
};

const cacheFilters = async () => {
  log("\n Pre-loading filters...");
  const cacheKey = getFiltersCacheKey();
  if (await isCached(cacheKey)) return;

  const [languages, ages, genres, priceAgg] = await Promise.all([
    Book.distinct("bookLanguage", { status: "in stock" }),
    Book.distinct("recommendedAge", { status: "in stock" }),
    Genre.find().select("name").lean(),
    Book.aggregate([
      { $match: { status: "in stock" } },
      { $group: { _id: null, min: { $min: "$price" }, max: { $max: "$price" } } }
    ])
  ]);

  await cacheData(cacheKey, {
    status: "success",
    data: {
      languages,
      ages,
      genres,
      priceRange: priceAgg[0] || { min: 0, max: 1000 }
    }
  }, 1800);
  log(" Filters cached!");
};

export const warmCache = async () => {
  try {
    log("\n Starting Warm Cache Strategy...");
    await Promise.all([cachePages(), cacheCategories(), cacheFilters()]);
    log(" Warm Cache Completed!\n");
  } catch (err) {
    console.error("Warm cache error:", err);
  }
};
