import Joi from "joi";

export const createReviewSchema = Joi.object({
  book: Joi.string().hex().length(24).required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  title: Joi.string().trim().max(120).allow(""),
  body: Joi.string().trim().max(5000).allow(""),
});

export const updateReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5),
  title: Joi.string().trim().max(120).allow(""),
  body: Joi.string().trim().max(5000).allow(""),
}).min(1);

export const listByBookQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  sort: Joi.string().valid("top", "new").default("new"),
});
