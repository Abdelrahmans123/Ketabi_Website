import Book from "../models/Book.js";
import {
    create,
    findAll,
    findById,
    findByIdAndUpdate,
    findOne,
    remove,
} from "../models/services/db.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { successResponse } from "../utils/successResponse.js";
import User from "../models/User.js";
import { Types } from "mongoose";
//import { uploadBufferToS3 } from "../config/s3.js";
import { uploadBufferToS3, generateSignedDownloadUrl } from "../config/s3.js";
import {
    notifyBookBackInStock,
    notifyPriceDrop,
    notifyNewEdition,
    notifyLowStock,
} from "../services/BookAvailabilityNotification.js";
import Genre from "../models/Genre.js";
import { roleEnum } from "../utils/roleEnum.js";
import mongoose from "mongoose"; // added for ObjectId validation

export const AddBook = asyncHandler(async (req, res, next) => {
    const publisherId = req.user.id;
    req.body.publisher = publisherId;

    if (!req.body.genre_id) {
        return next(new AppError("genre_id is required", 400));
    }
    if (!mongoose.Types.ObjectId.isValid(String(req.body.genre_id))) {
        return next(new AppError("Invalid genre_id", 400));
    }

    const genre = await findById({ model: Genre, id: req.body.genre_id });
    if (!genre) {
        return next(new AppError("No Such genre exists", 404));
    }

    req.body.genre = genre._id;
    delete req.body.genre_id;

    if (req.body.imageUrl) {
        req.body.image = { url: req.body.imageUrl };
        delete req.body.imageUrl;
    }

    const duplicateBook = await Book.findOne({
        publisher: publisherId,
        name: req.body.name,
        Edition: req.body.Edition,
    });

    if (duplicateBook) {
        return next(new AppError("Can't post the same book twice!", 409));
    }

    if (!req.file) {
        const book = await create({ model: Book, data: req.body });

        await findByIdAndUpdate({
            model: User,
            id: publisherId,
            data: { $addToSet: { booksPublished: book._id } },
        });

        return successResponse({
            res,
            statusCode: 201,
            message: "Book Added Successfully (no file)",
            data: book,
        });
    }

    const file = req.file;
    const result = await uploadBufferToS3(
        file.buffer,
        file.originalname,
        file.mimetype,
        "books/pdf"
    );

    const bookData = {
        ...req.body,
        pdf: {
            key: result.key,
            url: result.url,
            fileName: result.fileName,
            size: result.size,
            mimeType: result.mimeType,
            uploadedAt: result.uploadedAt,
        },
    };

    const book = await create({ model: Book, data: bookData });
    if (book.publisher) {
        await findByIdAndUpdate({
            model: User,
            id: book.publisher,
            data: { $addToSet: { booksPublished: book._id } },
        });
    }

    if (book.author) {
        await notifyNewEdition(book._id, book.author);
    }

    return successResponse({
        res,
        statusCode: 201,
        message: "Book Added Successfully",
        data: book,
    });
});

export const getBookByID = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const book = await findById({ model: Book, id, populate: "genre" });
    if (!book) {
        const error = new AppError("Book Not Found", 404);
        return next(error);
    }
    return successResponse({
        res,
        statusCode: 200,
        message: "Book Retrieved Successfully",
        data: book,
    });
});

export const updateBook = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    const oldBook = await findById({ model: Book, id });
    if (!oldBook) {
        const error = new AppError("Book Not Found", 404);
        return next(error);
    }

    if (req.user.role === roleEnum.publisher) {
        if (!req.user.booksPublished.includes(id)) {
            const error = new AppError("Can't update book you don't own!", 404);
            return next(error);
        }
    }


    const updateData = { ...req.body };

    if (updateData.imageUrl) {
        updateData.image = { url: updateData.imageUrl };
        delete updateData.imageUrl;
    }

    if (updateData.price !== undefined) {
        updateData.price = typeof updateData.price === 'string' ? parseFloat(updateData.price) : updateData.price;
    }
    if (updateData.cost !== undefined) {
        updateData.cost = typeof updateData.cost === 'string' ? parseFloat(updateData.cost) : updateData.cost;
    }
    if (updateData.discount !== undefined && updateData.discount !== '') {
        updateData.discount = typeof updateData.discount === 'string' ? parseFloat(updateData.discount) : updateData.discount;
    }
    if (updateData.stock !== undefined) {
        updateData.stock = typeof updateData.stock === 'string' ? parseInt(updateData.stock, 10) : updateData.stock;
    }
    if (updateData.noOfPages !== undefined) {
        updateData.noOfPages = typeof updateData.noOfPages === 'string' ? parseInt(updateData.noOfPages, 10) : updateData.noOfPages;
    }


    if (updateData.price !== undefined && updateData.cost !== undefined) {
        if (updateData.price <= updateData.cost) {
            return next(new AppError("Price must be greater than cost", 400));
        }
    } else if (updateData.price !== undefined) {

        if (updateData.price <= oldBook.cost) {
            return next(new AppError("Price must be greater than cost", 400));
        }
    } else if (updateData.cost !== undefined) {

        if (oldBook.price <= updateData.cost) {
            return next(new AppError("Price must be greater than cost", 400));
        }
    }

    if (updateData.genre_id) {
        if (!mongoose.Types.ObjectId.isValid(String(updateData.genre_id))) {
            return next(new AppError("Invalid genre_id", 400));
        }

        const genre = await findById({ model: Genre, id: updateData.genre_id });
        if (!genre) {
            return next(new AppError("No Such genre exists", 404));
        }

        updateData.genre = genre._id;
        delete updateData.genre_id;
    }

    //    pdf ----------  upload 
    if (req.file) {
        const file = req.file;
        const result = await uploadBufferToS3(
            file.buffer,
            file.originalname,
            file.mimetype,
            "books/pdf"
        );

        updateData.pdf = {
            key: result.key,
            url: result.url,
            fileName: result.fileName,
            size: result.size,
            mimeType: result.mimeType,
            uploadedAt: result.uploadedAt,
        };
    }

    const isTheSameBook = Object.keys(updateData).every((key) => {
        // Skip PDF comparison as it's an object
        if (key === 'pdf') return true;
        return updateData[key] === oldBook[key];
    });

    if (isTheSameBook && !req.file) {
        return successResponse({
            res,
            statusCode: 200,
            message: "Nothing changed! The book is the same",
            data: oldBook,
        });
    }

    const updatedBook = await findByIdAndUpdate({
        model: Book,
        id,
        data: updateData,
    });

    if (
        oldBook.status === "out of stock" &&
        updatedBook.status === "in stock"
    ) {
        await notifyBookBackInStock(id);
    }
    if (
        updateData.price !== undefined &&
        updatedBook.price < oldBook.price &&
        updatedBook.status === "in stock"
    ) {
        await notifyPriceDrop(id, oldBook.price, updatedBook.price);
    }
    if (
        updateData.stock !== undefined &&
        updatedBook.stock <= 5 &&
        updatedBook.stock > 0 &&
        updatedBook.status === "in stock"
    ) {
        await notifyLowStock(id);
    }
    return successResponse({
        res,
        statusCode: 200,
        message: "Book Updated Successfully",
        data: updatedBook,
    });
});

export const deleteBook = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    if (req.user.role === roleEnum.publisher) {
        if (!req.user.booksPublished.includes(id)) {
            const error = new AppError("Can't delete book you don't own!", 404);
            return next(error);
        }
    }

    const deletedBook = await remove({ model: Book, query: { _id: id } });
    if (!deletedBook) {
        const error = new AppError("Book Not Found", 404);
        return next(error);
    }

    // update published books array in the publisher document
    if (req.user.role === roleEnum.publisher) {
        await findByIdAndUpdate({
            model: User,
            id: req.user.id,
            data: { $pull: { booksPublished: id } },
        });
    }

    return successResponse({
        res,
        statusCode: 200,
        message: "Book Deleted Successfully",
        data: deletedBook,
    });
});

export const downloadBook = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user._id;

    // Check if the book is in the user's library
    const user = await User.findById(userId).select("library");
    if (!user) {
        return next(new AppError("User not found", 404));
    }

    const hasBook = user.library.some(
        (bookId) => bookId.toString() === id.toString()
    );

    if (!hasBook) {
        return next(
            new AppError(
                "You do not own this eBook. Please purchase it before downloading.",
                403
            )
        );
    }

    // Fetch the book details
    const book = await Book.findById(id);
    if (!book || !book.pdf?.key) {
        return next(new AppError("Book or file not found", 404));
    }
    const signedUrl = await generateSignedDownloadUrl(book.pdf.key, 60);

    return res.json({
        success: true,
        data: {
            url: signedUrl,
            fileName: book.pdf.fileName || `${book.name}.pdf`
        }
    });
});

export const getBooksByCategory = asyncHandler(async (req, res, next) => {
    const { category } = req.params;
    if (!category) {
        return next(new AppError("Category parameter is required", 400));
    }

    const cat = String(category).trim().toLowerCase();

    let filter = {};
    if (cat === "arabic") {
        filter.bookLanguage = "arabic";
    } else if (cat === "english") {
        filter.bookLanguage = "english";
    } else if (cat === "kids") {
        filter.recommendedAge = "kids";
    } else if (cat === "new") {
        filter = {};
    } else {
        return next(
            new AppError(
                "Invalid category. Must be Arabic, English, Kids or New",
                400
            )
        );
    }

    const books = await Book.find(filter)
        .sort({ createdAt: -1 })
        .limit(8)
        .select("name author image.url genre price rating discount stock status")
        .lean();
    if (!books || books.length === 0) {
        return next(
            new AppError(`No books found in category: ${category}`, 404)
        );
    }

    return successResponse({
        res,
        statusCode: 200,
        message: `Books in category ${category} retrieved successfully`,
        data: books,
    });
});

//////////////////    Get Book With Filters  //////////////////////////////////////////////////////////
export const getBooks = asyncHandler(async (req, res, next) => {
    const {
        language,
        age,
        genre,
        minPrice = 0,
        maxPrice = 1000,
        sort = "-createdAt",
        limit = 12,
        skip = 0,
    } = req.query;

    const limitNum = Math.min(parseInt(limit) || 12, 100);
    const skipNum = Math.max(parseInt(skip) || 0, 0);
    const minPriceNum = Math.max(parseInt(minPrice) || 0, 0);
    const maxPriceNum = Math.min(parseInt(maxPrice) || 10000, 10000);

    const filter = {
        status: "in stock",
        price: { $gte: minPriceNum, $lte: maxPriceNum },
    };

    if (language) filter.bookLanguage = language;
    if (age) filter.recommendedAge = age;
    if (genre) filter.genre = new Types.ObjectId(genre);

    const sortObj = {};
    if (sort.startsWith("-")) {
        sortObj[sort.substring(1)] = -1;
    } else {
        sortObj[sort] = 1;
    }

    const [books, total] = await Promise.all([
        Book.find(filter)
            .populate("genre", "name")
            .select("-pdf")
            .sort(sortObj)
            .skip(skipNum)
            .limit(limitNum)
            .lean()
            .exec(),
        Book.countDocuments(filter),
    ]);

    return successResponse({
        res,
        statusCode: 200,
        message: "Books retrieved successfully",
        data: {
            books,
            pagination: {
                total,
                limit: limitNum,
                skip: skipNum,
                hasMore: skipNum + limitNum < total,
            },
        },
    });
});
////////////
export const getFilters = asyncHandler(async (req, res, next) => {
    const [languages, ages, genres, priceAgg] = await Promise.all([
        Book.distinct("bookLanguage", { status: "in stock" }),
        Book.distinct("recommendedAge", { status: "in stock" }),
        Genre.find().select("name").lean().exec(),
        Book.aggregate([
            { $match: { status: "in stock" } },
            {
                $group: {
                    _id: null,
                    min: { $min: "$price" },
                    max: { $max: "$price" },
                },
            },
        ]),
    ]);

    const priceRange = priceAgg[0] || { min: 0, max: 1000 };

    return successResponse({
        res,
        statusCode: 200,
        message: "Filters retrieved successfully",
        data: {
            languages,
            ages,
            genres,
            priceRange,
        },
    });
});
//////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////  Search Books  With Autocomplete ///////////////////////////////////////////
export const searchBooks = asyncHandler(async (req, res, next) => {
    const { query, language, age, limit = 12, skip = 0 } = req.query;

    if (!query || query.trim().length < 2) {
        return next(
            new AppError("Search query must be at least 2 characters", 400)
        );
    }

    const limitNum = Math.min(parseInt(limit) || 12, 100);
    const skipNum = Math.max(parseInt(skip) || 0, 0);
    const queryTrimmed = query.trim();

    // Atlas Search stage
    const searchStage = {
        index: "bookSearch",
        compound: {
            should: [
                {
                    autocomplete: {
                        query: queryTrimmed,
                        path: "name",
                        fuzzy: { maxEdits: 1, prefixLength: 2 },
                        score: { boost: { value: 3 } },
                    },
                },
                {
                    autocomplete: {
                        query: queryTrimmed,
                        path: "author",
                        fuzzy: { maxEdits: 1, prefixLength: 2 },
                        score: { boost: { value: 2 } },
                    },
                },
                {
                    text: {
                        query: queryTrimmed,
                        path: "description",
                        fuzzy: { maxEdits: 1 },
                        score: { boost: { value: 1 } },
                    },
                },
            ],
            minimumShouldMatch: 1,
        },
    };

    const filters = [];
    if (language) {
        filters.push({ text: { query: language, path: "bookLanguage" } });
    }
    if (age) {
        filters.push({ text: { query: age, path: "recommendedAge" } });
    }
    if (filters.length) {
        searchStage.compound.filter = filters;
    }

    // Aggregation pipeline

    const pipeline = [
        { $search: searchStage },
        { $addFields: { searchScore: { $meta: "searchScore" } } },
        { $match: { status: "in stock" } },
        {
            $lookup: {
                from: "genres",
                localField: "genre",
                foreignField: "_id",
                as: "genreDetails",
            },
        },
        {
            $unwind: {
                path: "$genreDetails",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $facet: {
                metadata: [{ $count: "total" }],
                data: [
                    { $sort: { searchScore: -1, _id: 1 } },
                    { $skip: skipNum },
                    { $limit: limitNum },
                    {
                        $project: {
                            name: 1,
                            author: 1,
                            description: 1,
                            price: 1,
                            discount: 1,
                            finalPrice: {
                                $subtract: [
                                    "$price",
                                    {
                                        $multiply: [
                                            "$price",
                                            {
                                                $divide: [
                                                    {
                                                        $ifNull: [
                                                            "$discount",
                                                            0,
                                                        ],
                                                    },
                                                    100,
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                            image: 1,
                            avgRating: 1,
                            ratingsCount: 1,
                            bookLanguage: 1,
                            recommendedAge: 1,
                            "genreDetails.name": 1,
                            searchScore: 1,
                            stock: 1,
                            status: 1
                        },
                    },
                ],
            },
        },
    ];

    const startTime = Date.now();
    const [result] = await Book.aggregate(pipeline);
    const queryTime = Date.now() - startTime;
    const total = result.metadata[0]?.total || 0;
    return successResponse({
        res,
        statusCode: 200,
        message: "Search completed successfully",
        data: {
            books: result.data,
            pagination: {
                total,
                limit: limitNum,
                skip: skipNum,
                hasMore: skipNum + limitNum < total,
                queryTime: `${queryTime}ms`,
            },
        },
    });
});
//////////
export const autocompleteSuggestions = asyncHandler(async (req, res, next) => {
    const { query, limit = 5 } = req.query;

    if (!query || query.trim().length < 2) {
        return successResponse({
            res,
            statusCode: 200,
            message: "No query provided",
            data: [],
        });
    }

    const queryTrimmed = query.trim();
    const limitNum = Math.min(parseInt(limit) || 5, 20);

    try {
        const pipeline = [
            {
                $search: {
                    index: "bookSearch",
                    compound: {
                        should: [
                            {
                                autocomplete: {
                                    query: queryTrimmed,
                                    path: "name",
                                    fuzzy: {
                                        maxEdits: 1,
                                        prefixLength: 1,
                                    },
                                    score: { boost: { value: 2 } },
                                },
                            },
                            {
                                autocomplete: {
                                    query: queryTrimmed,
                                    path: "author",
                                    fuzzy: {
                                        maxEdits: 1,
                                        prefixLength: 1,
                                    },
                                    score: { boost: { value: 1 } },
                                },
                            },
                        ],
                        minimumShouldMatch: 1,
                    },
                },
            },
            { $match: { status: "in stock" } },
            { $limit: limitNum },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    author: 1,
                    image: 1,
                    price: 1,
                },
            },
        ];

        const suggestions = await Book.aggregate(pipeline)
            .maxTimeMS(5000)
            .exec();

        return successResponse({
            res,
            statusCode: 200,
            message: "Suggestions retrieved successfully",
            data: suggestions,
        });
    } catch (atlasError) {
        console.warn(
            "  Atlas autocomplete failed, using fallback...",
            atlasError.message
        );

        const regexQuery = new RegExp(queryTrimmed, "i");

        const suggestions = await Book.find(
            {
                status: "in stock",
                $or: [{ name: regexQuery }, { author: regexQuery }],
            },
            { _id: 1, name: 1, author: 1, image: 1, price: 1 }
        )
            .limit(limitNum)
            .lean()
            .maxTimeMS(5000)
            .exec();

        return successResponse({
            res,
            statusCode: 200,
            message: "Suggestions retrieved successfully (fallback)",
            data: suggestions,
        });
    }
});
///////////////////////////////////////////////////////////////////////////////////////////////////////
