// controllers/genreController.js
import Genre from "../models/Genre.js";
import { create, findAll, findBySlug, findBySlugAndDelete, findBySlugAndUpdate } from "../models/services/db.js";
import appErrorInstance from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sendJSON, STATUS_CODE, STATUS_TEXT } from "../utils/jsend.js";

export const getGenres = asyncHandler(async (req, res) => {
  const query = req.query;
  const limit = query.limit || 10;
  const page = query.page || 1;
  const skip = (page - 1) * limit;
  const genres = await findAll(Genre, {}, { skip, limit: parseInt(limit) });
  sendJSON(res, STATUS_CODE.OK, STATUS_TEXT.SUCCESS, genres);
});

export const createGenre = asyncHandler(async (req, res) => {
  const newGenre = await create(Genre, req.body);
  sendJSON(res, STATUS_CODE.CREATED, STATUS_TEXT.SUCCESS, newGenre);
});

export const getGenreBySlug = asyncHandler(async (req, res, next) => {
  const { slug } = req.params;
  const genre = await findBySlug(Genre, slug);
  if (!genre) {
    const error = appErrorInstance.create("Genre not found", 404);
    return next(error);
  }
  sendJSON(res, STATUS_CODE.OK, STATUS_TEXT.SUCCESS, genre);
});

export const updateGenre = asyncHandler(async (req, res, next) => {
    const { slug } = req.params;
    const updatedGenre = await findBySlugAndUpdate(Genre, slug, req.body);
    if (!updatedGenre) {
        const error = appErrorInstance.create("Genre not found", 404);
        return next(error);
    }
    sendJSON(res, STATUS_CODE.OK, STATUS_TEXT.SUCCESS, updatedGenre);
});

export const deleteGenre = asyncHandler(async (req, res, next) => {
    const { slug } = req.params;
    const deletedGenre = await findBySlugAndDelete(Genre, slug);
    if (!deletedGenre) {
        const error = appErrorInstance.create("Genre not found", 404);
        return next(error);
    }
    sendJSON(res, STATUS_CODE.OK, STATUS_TEXT.SUCCESS, { message: "Genre deleted successfully" });
});
