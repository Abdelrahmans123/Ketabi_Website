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
