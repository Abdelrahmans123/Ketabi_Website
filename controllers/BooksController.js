import Book from "../models/Book.js";
import { create, findAll, findById, remove } from "../models/services/db.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { successResponse } from "../utils/successResponse.js";
import { uploadBufferToS3 } from "../config/s3.js"; 

export const AddBook = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    const book = await create(Book, req.body);
    return successResponse({
      res,
      statusCode: 201,
      message: "Book Added Successfully (no file)",
      data: book,
    });
  }


  const file = req.file;
  const result = await uploadBufferToS3(file.buffer, file.originalname, file.mimetype, "books/pdf");

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

  const book = await create(Book, bookData);

  return successResponse({
    res,
    statusCode: 201,
    message: "Book Added Successfully",
    data: book,
  });
});

export const getBooks = asyncHandler(async (req, res, next) => {
    const books = await findAll(Book);
    if (books.length === 0) {
        const error = AppError.create("No Books Found", 404);
        return next(error);
    }
    return successResponse({
        res,
        statusCode: 200,
        message: "Books Retrieved Successfully",
        data: books,
    });
});

export const getBookByID = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const book = await findById(Book, id);
    if (!book) {
        const error = AppError.create("Book Not Found", 404);
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
    const updatedBook = await findByIdAndUpdate(Book, id, req.body, {
        new: true,
    });
    if (!updatedBook) {
        const error = AppError.create("Book Not Found", 404);
        return next(error);
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
    const deletedBook = await remove(Book, { _id: id });
    if (!deletedBook) {
        const error = AppError.create("Book Not Found", 404);
        return next(error);
    }
    return successResponse({
        res,
        statusCode: 200,
        message: "Book Deleted Successfully",
        data: deletedBook,
    });
});
