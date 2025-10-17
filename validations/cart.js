
import Joi from "joi";

export const getCartSchema = Joi.object({
    // No parameters needed for getting the cart

});

export const addToCartSchema = Joi.object({
    book: Joi.string().required(),//.message('Invalid Book Id'),
    quantity: Joi.number().required().min(1),//.message('Invalid quantity. Minimum is 1'),
    type: Joi.string().required().valid("physical","ebook")
});

export const updateCartSchema = Joi.object({
    quantity: Joi.number().required().min(1),//.message('Invalid quantity to updated. Minimum is 1')
});

export const removeCartItemSchema = Joi.object({
    book: Joi.string().required()//.message('Invalid Book Id')
})
