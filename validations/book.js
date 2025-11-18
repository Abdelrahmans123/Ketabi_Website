import Joi from "joi";

export const createSchema = Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
        "string.empty": "Book name is required",
        "string.min": "Book name must be at least 2 characters",
        "string.max": "Book name must be at most 100 characters",
    }),
    author: Joi.string().min(2).max(100).required().messages({
        "string.empty": "Author name is required",
        "string.min": "Author name must be at least 2 characters",
        "string.max": "Author name must be at most 100 characters",
    }),
    description: Joi.string().max(1000).optional().messages({
        "string.max": "Description must be at most 1000 characters",
    }),
    Edition: Joi.string().max(50).required().messages({
        "any.required": "Edition is required",
        "string.max": "Edition must be at most 50 characters",
    }),
    genre_id: Joi.string().min(2).max(50).required().messages({
        "string.empty": "Genre ID is required",
        "string.min": "Genre ID must be at least 2 characters",
        "string.max": "Genre ID must be at most 50 characters",
    }),
    price: Joi.number().min(0).required().messages({
        "number.base": "Price must be a number",
        "number.min": "Price cannot be negative",
        "any.required": "Price is required",
    }),
    discount: Joi.number().min(0).max(100).default(0).messages({
        "number.base": "Discount must be a number",
        "number.min": "Discount cannot be negative",
        "number.max": "Discount cannot exceed 100%",
    }),
    cost: Joi.number().min(0).required().messages({
        "number.base": "Cost must be a number",
        "number.min": "Cost cannot be negative",
        "any.required": "Cost is required",
    }),
    stock: Joi.number().integer().min(0).required().messages({
        "number.base": "Stock must be a number",
        "number.min": "Stock cannot be negative",
        "any.required": "Stock is required",
    }),
    noOfPages: Joi.number().integer().min(1).required().messages({
        "number.base": "Number of pages must be a number",
        "number.min": "Number of pages must be at least 1",
        "any.required": "Number of pages is required",
    }),
    status: Joi.string()
        .valid("in stock", "out of stock")
        .default("in stock")
        .messages({
            "any.only": "Status must be either 'in stock' or 'out of stock'",
        }),
    bookLanguage: Joi.string()
        .optional()
        .valid("arabic", "english")
        .default("english")
        .messages({
            'any.only': 'Book language must be one of the allowed values: arabic, english.',
            'string.base': 'Book language must be a string.'
        }),
    recommendedAge: Joi.string()
        .optional()
        .valid("kids", "adults", "all")
        .default("all")
        .messages({
            'any.only': 'Recommended age must be one of the allowed values: kids, adults, or all.',
            'string.base': 'Recommended age must be a string.'
        }),
    imageUrl: Joi.string().uri().optional().messages({
        "string.uri": "Image must be a valid URL",
    }),
});

export const getBookByIdSchema = Joi.object({
    id: Joi.string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .message("Invalid book ID: must be a valid MongoDB ObjectId")
        .required(),
});

export const updateByBookIdSchema = Joi.object({
    id: Joi.string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .message("Invalid book ID: must be a valid MongoDB ObjectId")
        .required(),
});

export const updateSchema = Joi.object({
    name: Joi.string().min(2).max(100).optional().messages({
        "string.min": "Book name must be at least 2 characters",
        "string.max": "Book name must be at most 100 characters",
    }),
    author: Joi.string().min(2).max(100).optional().messages({
        "string.min": "Author name must be at least 2 characters",
        "string.max": "Author name must be at most 100 characters",
    }),
    description: Joi.string().max(1000).optional().messages({
        "string.max": "Description must be at most 1000 characters",
    }),
    Edition: Joi.string().max(50).optional().messages({
        "string.max": "Edition must be at most 50 characters",
    }),
    genre_id: Joi.string().min(2).max(50).optional().messages({
        "string.min": "Genre ID must be at least 2 characters",
        "string.max": "Genre ID must be at most 50 characters",
    }),
    bookLanguage: Joi.string()
        .optional()
        .valid("arabic", "english")
        .messages({
            'any.only': 'Book language must be one of the allowed values: arabic, english.',
            'string.base': 'Book language must be a string.'
        }),
    recommendedAge: Joi.string()
        .optional()
        .valid("kids", "adults", "all")
        .messages({
            'any.only': 'Recommended age must be one of the allowed values: kids, adults, or all.',
            'string.base': 'Recommended age must be a string.'
        }),
    categoryName: Joi.string().min(2).max(50).optional().messages({
        "string.min": "Category name must be at least 2 characters",
        "string.max": "Category name must be at most 50 characters",
    }),
    price: Joi.number().min(0).optional().messages({
        "number.base": "Price must be a number",
        "number.min": "Price cannot be negative",
    }),
    discount: Joi.number().min(0).max(100).optional().messages({
        "number.base": "Discount must be a number",
        "number.min": "Discount cannot be negative",
        "number.max": "Discount cannot exceed 100%",
    }),
    cost: Joi.number().min(0).optional().messages({
        "number.base": "Cost must be a number",
        "number.min": "Cost cannot be negative",
    }),
    stock: Joi.number().integer().min(0).optional().messages({
        "number.base": "Stock must be a number",
        "number.min": "Stock cannot be negative",
    }),
    noOfPages: Joi.number().integer().min(1).optional().messages({
        "number.base": "Number of pages must be a number",
        "number.min": "Number of pages must be at least 1",
    }),
    status: Joi.string().valid("in stock", "out of stock").optional().messages({
        "any.only": "Status must be either 'in stock' or 'out of stock'",
    }),
    imageUrl: Joi.string().uri().optional().messages({
        "string.uri": "Image must be a valid URL",
    }),
});
