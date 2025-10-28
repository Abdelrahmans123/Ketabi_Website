import express from "express";
import {AddBook,getBooks,getBookByID,updateBook,deleteBook,downloadBook} from "../controllers/BooksController.js";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorization.js";
import upload from "../middlewares/upload.js";
import {validate}  from "../middlewares/validation.js";
import { createSchema, updateSchema } from "../validations/book.js";
import { roleEnum } from "../utils/roleEnum.js";

const router = express.Router();

router.post("/Create-Book",authenticate, authorize(roleEnum.publisher),validate(createSchema), upload.single("pdf"),AddBook);
router.get("/List-Books", getBooks);
router.get("/Get-Book/:id", getBookByID);
router.put("/Update-Book/:id", authenticate, authorize("admin", "author"), validate(updateSchema), updateBook);
router.delete("/Delete/:id",authenticate,authorize("admin", "author"),deleteBook);
router.get("/Download-Book/:id", authenticate, downloadBook);

export default router;
