import express from "express";
import {
    AddBook,
    getBooks,
    getBookByID,
    updateBook,
    deleteBook,
} from "../controllers/BooksController.js";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorization.js";

const router = express.Router();

router.post("/", authenticate, authorize("admin", "author"), AddBook);
router.get("/", getBooks);
router.get("/:id", getBookByID);
router.put("/:id", authenticate, authorize("admin", "librarian"), updateBook);
router.delete(
    "/:id",
    authenticate,
    authorize("admin", "librarian"),
    deleteBook
);

export default router;
