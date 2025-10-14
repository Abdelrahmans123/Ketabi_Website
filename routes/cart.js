import express from "express";
import { authenticate } from "../middlewares/auth.js";
import { addToCart, removeCartItem, updateCartItem } from "../validations/cart.js"
import { validate } from "../middlewares/validation.js";
import { addTocart, getCart, removeFromCart, updateCart} from "../controllers/cartController.js"

const router = express.Router();


router.get('/', authenticate, getCart);
router.post('/', authenticate, validate(addToCart), addTocart);
router.put('/:bookId', authenticate, validate(updateCartItem), updateCart);
router.delete('/:bookId', authenticate,  validate(removeCartItem), removeFromCart);

export default router;
