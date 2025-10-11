import Joi from "joi";

export const createGenreSchema = Joi.object({
  name: Joi.string().min(2).max(50).required().messages({
    "string.empty": "Genre name is required",
    "string.min": "Genre name must be at least 2 characters",
    "string.max": "Genre name must be at most 50 characters",
  }),
  description: Joi.string().max(500).optional().messages({
    "string.max": "Description must be at most 500 characters",
  }),
});

export const updateGenreSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional().messages({
    "string.min": "Genre name must be at least 2 characters",
    "string.max": "Genre name must be at most 50 characters",
  }),
  description: Joi.string().max(500).optional().messages({
    "string.max": "Description must be at most 500 characters",
  }),
});

