import express from "express";
import { authenticate } from "../middlewares/auth.js";
import { validate } from "../middlewares/validation.js";
import {
    addTocart,
    getCart,
    removeFromCart,
    updateCart,
} from "../controllers/cartController.js";
import {
    addToCartSchema,
    removeCartItemSchema,
    updateCartSchema,
} from "../validations/cart.js";

const router = express.Router();

router.get("/", authenticate, getCart);
router.post("/", authenticate, validate(addToCartSchema), addTocart);
router.put("/:bookId", authenticate, validate(updateCartSchema), updateCart);
router.delete(
    "/:bookId",
    authenticate,
    validate(removeCartItemSchema),
    removeFromCart
);

export default router;
