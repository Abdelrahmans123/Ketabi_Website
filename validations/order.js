import { itemType, orderStatus, paymentMethods, paymentStatus } from "../utils/orderEnums.js";
import Joi from "joi";

export const createOrderSchema = Joi.object({
  items: Joi.array()
    .min(1)
    .required()
    .items(
      Joi.object({
        book: Joi.string()
          .required()
          .regex(/^[0-9a-fA-F]{24}$/)
          .messages({
            'any.required': 'Book ID is required for each item',
            'string.empty': 'Book ID is required for each item',
            'string.pattern.base': 'Invalid Book ID',
          }),
        quantity: Joi.number()
          .integer()
          .min(1)
          .required()
          .messages({
            'any.required': 'Quantity is required for each item',
            'number.base': 'Quantity is required for each item',
            'number.min': 'Quantity must be an integer of at least 1',
            'number.integer': 'Quantity must be an integer of at least 1',
          }),
        type: Joi.string()
          .valid(...Object.values(itemType))
          .required()
          .messages({
            'any.required': 'Item type is required for each item',
            'string.empty': 'Item type is required for each item',
            'any.only': 'Item type not supported',
          })
      })
    )
    .messages({
      'any.required': 'Order items are missing',
      'array.base': 'Order items are missing',
      'array.min': 'Order must contain at least one item in an array format',
    }),
  shippingAddress: Joi.object({
    street: Joi.string(),
    city: Joi.string(),
    phoneNumber: Joi.string(),
  })
    .optional()
    .custom((value, helpers) => {
      const items = helpers.state.ancestors[0].items;
      const hasPhysicalBook = items?.some((item) => item.type === itemType.PHYSICAL);

      if (hasPhysicalBook) {
        if (!value.street || !value.city || !value.phoneNumber) {
          return helpers.error('any.custom', {
            message: 'All shipping address fields are required for physical book orders',
          });
        }
      }
      return value;
    })
    .messages({
      'object.base': 'Shipping address must be an object',
      'any.custom': 'All shipping address fields are required for physical book orders',
    }),
  paymentMethod: Joi.string()
    .valid(...Object.values(paymentMethods))
    .required()
    .messages({
      'any.required': 'Payment method is required',
      'string.empty': 'Payment method is required',
      'any.only': 'Payment method not supported',
    }),
  isGift: Joi.boolean().optional().messages({
    'boolean.base': 'isGift must be a boolean',
  }),
  recipientEmail: Joi.string()
    .email()
    .when('isGift', {
      is: true,
      then: Joi.required().messages({
        'any.required': 'Recipient email is required when the order is marked as a gift',
      }),
      otherwise: Joi.optional(),
    }),
  personalizedMessage: Joi.string()
    .when('isGift', {
      is: true,
      then: Joi.required().messages({
        'any.required': 'personalized message is required when the order is marked as a gift',
      }),
      otherwise: Joi.optional(),
    }),
  coupon: Joi.string().optional()
});

export const getAllOrdersSchema = Joi.object({
  user: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional().messages({ 'string.pattern.base': 'Invalid User ID', }),
  email: Joi.string().email().optional(),
  orderStatus: Joi.string().valid(...Object.values(orderStatus)).optional().messages({ 'any.only': 'Invalid order status', }),
  orderNumber: Joi.string().optional(),
  paymentStatus: Joi.string().valid(...Object.values(paymentStatus)).optional(),
  page: Joi.number().integer().min(1).default(1).messages({'number.min': 'Page must be at least 1','number.integer': 'Page must be an integer',}),
  limit: Joi.number().integer().min(1).max(100).default(10).messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100',
      'number.integer': 'Limit must be an integer',
    }),
  sortOrder: Joi.string().valid("asc","dec").default("asc").optional(),
  sortBy: Joi.string().optional().valid('createdAt').default('createdAt'),
});

export const getUserOrderSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({'number.min': 'Page must be at least 1','number.integer': 'Page must be an integer',}),
  limit: Joi.number().integer().min(1).max(100).default(10).messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100',
      'number.integer': 'Limit must be an integer',
    }),
});