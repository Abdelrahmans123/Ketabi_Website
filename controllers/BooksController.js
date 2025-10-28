import Book from "../models/Book.js";
import {
    create,
    findAll,
    findById,
    findByIdAndUpdate,
    remove,
} from "../models/services/db.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { successResponse } from "../utils/successResponse.js";
import User from "../models/User.js";
//import { uploadBufferToS3 } from "../config/s3.js";
import { uploadBufferToS3, generateSignedDownloadUrl } from "../config/s3.js";
import {
    notifyBookBackInStock,
    notifyPriceDrop,
    notifyNewEdition,
    notifyLowStock,
} from "../services/BookAvailabilityNotification.js";

export const AddBook = asyncHandler(async (req, res, next) => {
    const publisherId = req.user.id;
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
            data: { $push: { booksPublished: book._id } },
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
export const getBooks = asyncHandler(async (req, res, next) => {
    const query = req.query;
    const limit = parseInt(query.limit) || 10;
    const page = parseInt(query.page) || 1;
    const skip = (page - 1) * limit;

    const filter = {};
    if (query.title) filter.title = { $regex: query.title, $options: "i" };
    if (query.author) filter.author = { $regex: query.author, $options: "i" };
    if (query.genre) filter.genre = query.genre;

    let sort = {};
    if (query.sortBy && query.order) {
        sort[query.sortBy] = query.order === "desc" ? -1 : 1;
    } else {
        sort = { createdAt: -1 };
    }

    // const books = await Book.find(filter).skip(skip).limit(limit).sort(sort);
    const books = await findAll({
        model: Book,
        filter,
        skip,
        limit,
        sort,
    });
    const totalBooks = await Book.countDocuments(filter);

    if (!books.length) {
        const error = new AppError("No Books Found", 404);
        return next(error);
    }

    const data = {
        books,
        pagination: {
            totalBooks,
            currentPage: page,
            totalPages: Math.ceil(totalBooks / limit),
            limit,
        },
    };

    return successResponse({
        res,
        statusCode: 200,
        message: "Books Retrieved Successfully",
        data,
    });
});

export const getBookByID = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const book = await findById({ model: Book, id });
    if (!book) {
        const error = AppError("Book Not Found", 404);
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

    // Get the old book data before update
    const oldBook = await findById({ model: Book, id });
    if (!oldBook) {
        const error = AppError("Book Not Found", 404);
        return next(error);
    }

    // Update the book
    // const updatedBook = await Book.findByIdAndUpdate(id, req.body, {
    //     new: true,
    // });
    const updatedBook = await findByIdAndUpdate({
        model: Book,
        id,
        data: req.body,
    });
    if (
        oldBook.status === "out of stock" &&
        updatedBook.status === "in stock"
    ) {
        await notifyBookBackInStock(id);
    }
    if (
        req.body.price !== undefined &&
        updatedBook.price < oldBook.price &&
        updatedBook.status === "in stock"
    ) {
        await notifyPriceDrop(id, oldBook.price, updatedBook.price);
    }
    if (
        req.body.stock !== undefined &&
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
    const deletedBook = await remove({ model: Book, query: { _id: id } });
    if (!deletedBook) {
        const error = AppError("Book Not Found", 404);
        return next(error);
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

    // Generate temporary signed URL for download (expires in 60 seconds)
    const signedUrl = await generateSignedDownloadUrl(book.pdf.key, 60);

    return res.redirect(signedUrl);
});
