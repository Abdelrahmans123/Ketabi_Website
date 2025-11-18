/**
 * @swagger
 * tags:
 *   name: Books
 *   description: Book management endpoints
 */

/**
 * @swagger
 * /api/books/List-Books:
 *   get:
 *     summary: Get all books
 *     tags: [Books]
 *     responses:
 *       200:
 *         description: Successfully retrieved all books
 */

/**
 * @swagger
 * /api/books/Create-Book:
 *   post:
 *     summary: Create a new book
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []   # if JWT protected
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               author:
 *                 type: string
 *               pdf:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Book created successfully
 */

/**
 * @swagger
 * /api/books/Get-Book/{id}:
 *   get:
 *     summary: Get book by ID
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The book ID
 *     responses:
 *       200:
 *         description: Book found
 *       404:
 *         description: Book not found
 */

/**
 * @swagger
 * /api/books/Update-Book/{id}:
 *   put:
 *     summary: Update a book
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               author:
 *                 type: string
 *     responses:
 *       200:
 *         description: Book updated successfully
 */

/**
 * @swagger
 * /api/books/Delete/{id}:
 *   delete:
 *     summary: Delete a book
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Book deleted successfully
 */

import express from "express";
import {
    AddBook,
    getBooks,
    getBookByID,
    updateBook,
    deleteBook,
    downloadBook,
    getBooksByCategory,
    getFilters,
    searchBooks,
    autocompleteSuggestions
} from "../controllers/BooksController.js";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorization.js";
import upload from "../middlewares/upload.js";
import {
    queryValidate,
    validate,
    paramValidate,
} from "../middlewares/validation.js";
import {
    createSchema,
    updateSchema,
    getBookByIdSchema,
    updateByBookIdSchema as idParameterValidate,
} from "../validations/book.js";
import { roleEnum } from "../utils/roleEnum.js";
import { cacheMiddleware } from "../middlewares/cach.js";

const router = express.Router();

router.post(
    "/Create-Book",
    authenticate,
    // authorize(roleEnum.publisher),
    validate(createSchema),
    upload.single("pdf"),
    AddBook
);
//router.get("/List-Books", cacheMiddleware("List-Books"), getBooks);
router.get("/List-Books", cacheMiddleware("List-Books"), getBooks);

router.get(
    "/Get-Book/:id",
    paramValidate(getBookByIdSchema),
    cacheMiddleware("Get-Book"),
    getBookByID
);
router.put(
    "/Update-Book/:id",
    authenticate,
    authorize(roleEnum.admin, roleEnum.publisher),
    paramValidate(idParameterValidate),
    upload.single("pdf"),
    validate(updateSchema),
    updateBook
);

router.delete(
    "/Delete/:id",
    authenticate,
    authorize(roleEnum.admin, roleEnum.publisher),
    paramValidate(idParameterValidate),
    deleteBook
);
router.get(
    "/Download-Book/:id",
    authenticate,
    paramValidate(idParameterValidate),
    downloadBook
);

router.get("/", cacheMiddleware("books", { ttl: 600 }), getBooks); // 10 min
router.get("/filters", cacheMiddleware("filters", { ttl: 1800 }), getFilters); // 30 min
router.get("/search", cacheMiddleware("search", { ttl: 300 }), searchBooks); // 5 min
router.get("/search/autocomplete", autocompleteSuggestions);

router.get("/:category", cacheMiddleware("category"), getBooksByCategory);
export default router;
