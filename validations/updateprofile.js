import Joi from "joi";

export const updateProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).messages({"string.min": "Name must be at least 2 characters long.","string.max": "Name must be less than 50 characters long.",}),

  phone: Joi.string().pattern(/^\+?[0-9]{8,15}$/).message("Phone number must be valid and contain 8–15 digits."),

  gender: Joi.string().valid("male", "female", "other").messages({"any.only": "Gender must be one of: male, female, or other.",}),

  avatar: Joi.object({public_id: Joi.string().optional(),url: Joi.string().uri().optional(),}).optional(),

  address: Joi.alternatives().try(
    Joi.array().items(
      Joi.object({
        street: Joi.string().trim().min(2).max(100),
        city: Joi.string().trim().min(2).max(100),
      })
    ),
    Joi.object({
      street: Joi.string().trim().min(2).max(100),
      city: Joi.string().trim().min(2).max(100),
    })
  ),
});
