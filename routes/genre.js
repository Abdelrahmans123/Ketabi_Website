import express from "express";
import{
getGenres,
createGenre,
getGenreBySlug,
updateGenre,
deleteGenre} from "../controllers/genreController.js";
import { validate } from "../middlewares/validation.js";
import { createGenreSchema ,updateGenreSchema } from "../validations/genre.js";
const router = express.Router();

router.get("/", getGenres);
router.post("/", validate(createGenreSchema), createGenre);
router.get("/:slug", getGenreBySlug);
router.put("/:slug", validate(updateGenreSchema), updateGenre);
router.delete("/:slug", deleteGenre);
export default router;