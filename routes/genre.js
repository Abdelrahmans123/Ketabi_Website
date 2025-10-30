/**
 * @swagger
 * tags:
 *   name: Genres
 *   description: Book genre management endpoints
 */

/**
 * @swagger
 * /api/genres:
 *   get:
 *     summary: Get all genres
 *     description: Retrieve a list of all available book genres.
 *     tags: [Genres]
 *     responses:
 *       200:
 *         description: Successfully retrieved list of genres
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     example: Fiction
 *                   slug:
 *                     type: string
 *                     example: fiction
 */

/**
 * @swagger
 * /api/genres:
 *   post:
 *     summary: Create a new genre
 *     description: Add a new book genre. Typically restricted to admins or publishers.
 *     tags: [Genres]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Mystery
 *     responses:
 *       201:
 *         description: Genre created successfully
 *       400:
 *         description: Invalid input data
 */

/**
 * @swagger
 * /api/genres/{slug}:
 *   get:
 *     summary: Get a genre by slug
 *     description: Retrieve a single genre by its slug (unique identifier).
 *     tags: [Genres]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: The slug of the genre
 *         example: fiction
 *     responses:
 *       200:
 *         description: Genre retrieved successfully
 *       404:
 *         description: Genre not found
 */

/**
 * @swagger
 * /api/genres/{slug}:
 *   put:
 *     summary: Update a genre
 *     description: Update an existing genre by its slug.
 *     tags: [Genres]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: The slug of the genre to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Science Fiction
 *     responses:
 *       200:
 *         description: Genre updated successfully
 *       404:
 *         description: Genre not found
 *       400:
 *         description: Invalid data
 */

/**
 * @swagger
 * /api/genres/{slug}:
 *   delete:
 *     summary: Delete a genre
 *     description: Remove a genre from the system by slug.
 *     tags: [Genres]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: The slug of the genre to delete
 *     responses:
 *       200:
 *         description: Genre deleted successfully
 *       404:
 *         description: Genre not found
 */

import express from "express";
import{
getGenres,
createGenre,
getGenreBySlug,
updateGenre,
deleteGenre} from "../controllers/genreController.js";
import { validate } from "../middlewares/validation.js";
import { createGenreSchema ,updateGenreSchema } from "../validations/genre.js";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorization.js";
import { roleEnum } from "../utils/roleEnum.js";

const router = express.Router();

router.get("/", getGenres);
router.post("/", authenticate, authorize(roleEnum.admin), validate(createGenreSchema), createGenre);
router.get("/:slug", getGenreBySlug);
router.put("/:slug", authenticate, authorize(roleEnum.admin), validate(updateGenreSchema), updateGenre);
router.delete("/:slug", authenticate, authorize(roleEnum.admin), deleteGenre);
export default router;