import Joi from "joi";

export const addressValidation = Joi.array()
    .items(
        Joi.object({
            street: Joi.string().trim().required().messages({
                "string.empty": "Street is required",
                "any.required": "Street is required",
            }),
            city: Joi.string().trim().required().messages({
                "string.empty": "City is required",
                "any.required": "City is required",
            }),
        })
    )
    .min(1)
    .messages({
        "array.min": "At least one address is required",
    });
