/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Book review and rating endpoints
 */

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Create a new review
 *     description: Allows an authenticated user to write a review for a book.
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookId
 *               - rating
 *               - comment
 *             properties:
 *               bookId:
 *                 type: string
 *                 example: 654ff23b9c2b8c1c1a9e4567
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               comment:
 *                 type: string
 *                 example: "Amazing read! The story was captivating."
 *     responses:
 *       201:
 *         description: Review created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized - JWT required
 */

/**
 * @swagger
 * /api/reviews/book/{bookId}:
 *   get:
 *     summary: Get all reviews for a book
 *     description: Retrieve all reviews and ratings for a specific book.
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the book
 *     responses:
 *       200:
 *         description: Successfully retrieved reviews for the book
 *       404:
 *         description: Book not found or has no reviews
 */

/**
 * @swagger
 * /api/reviews/me:
 *   get:
 *     summary: Get reviews written by the authenticated user
 *     description: Retrieve all reviews created by the currently logged-in user.
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved user reviews
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/reviews/{id}:
 *   get:
 *     summary: Get a single review by ID
 *     description: Retrieve details of a specific review by its unique ID.
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The review ID
 *     responses:
 *       200:
 *         description: Review details retrieved successfully
 *       404:
 *         description: Review not found
 */

/**
 * @swagger
 * /api/reviews/{id}:
 *   patch:
 *     summary: Update a review
 *     description: Allows an authenticated user to update their review content or rating.
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the review to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: integer
 *                 example: 4
 *               comment:
 *                 type: string
 *                 example: "Updated: still great, but pacing could improve."
 *     responses:
 *       200:
 *         description: Review updated successfully
 *       400:
 *         description: Invalid update data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Review not found
 */

/**
 * @swagger
 * /api/reviews/{id}:
 *   delete:
 *     summary: Delete a review
 *     description: Allows an authenticated user to delete their own review.
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the review to delete
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Review not found
 */


import { Router } from "express";
import {
  createReview,
  listByBook,
  getOne,
  updateReview,
  deleteReview,
  listMine,
} from "../controllers/ReviewController.js";
import { authenticate } from "../middlewares/auth.js";
import { validate } from "../middlewares/validation.js";
import {
  createReviewSchema,
  updateReviewSchema,
  listByBookQuerySchema,
} from "../validations/review.js";

const router = Router();

router.post("/", authenticate, validate(createReviewSchema), createReview);
router.get(
  "/book/:bookId",
  validate(listByBookQuerySchema), 
  listByBook
);
router.get("/me", authenticate, listMine);
router.get("/:id", getOne);
router.patch("/:id", authenticate, validate(updateReviewSchema), updateReview);
router.delete("/:id", authenticate, deleteReview);

export default router;
