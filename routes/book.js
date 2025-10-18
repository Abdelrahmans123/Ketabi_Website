import express from "express";
import {AddBook,getBooks,getBookByID,updateBook,deleteBook,} from "../controllers/BooksController.js";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorization.js";
import upload from "../middlewares/upload.js";
import {validate}  from "../middlewares/validation.js";
import { createSchema, updateSchema } from "../validations/book.js";

const router = express.Router();

router.post("/Create-Book", authenticate, authorize("admin", "author"), upload.single("pdf"),validate(createSchema),AddBook);
router.get("/List-Books", getBooks);
router.get("/Get-Book/:id", getBookByID);
router.put("/Update-Book/:id", authenticate, authorize("admin", "author"), validate(updateSchema), updateBook);
router.delete("/Delete/:id",authenticate,authorize("admin", "author"),deleteBook);

export default router;
