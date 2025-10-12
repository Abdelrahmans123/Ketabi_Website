import express from "express";
import { authenticate } from "../middlewares/auth.js";
import { addToCart, removeCartItem, updateCartItem } from "../validations/cart.js"
import { validate } from "../middlewares/validation.js";

const cartController = require('../controllers/cartController');
const router = express.Router();


router.get('/', authenticate, cartController.getCart);
router.post('/', authenticate, validate(addToCart), cartController.addTocart);
router.put('/:bookId', authenticate, validate(updateCartItem), cartController.updateCart);
router.delete('/:bookId', authenticate,  validate(removeCartItem), cartController.removeFromCart);

export default router;
