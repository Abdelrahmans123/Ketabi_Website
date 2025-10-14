import express from "express";
import { authenticate } from "../middlewares/auth.js";
import { orderSchema } from "../validations/order.js";
import { validate } from "../middlewares/validation.js";
import { createOrder, getOrder, getOrderHistory } from "../controllers/orderController.js"


const router = express.Router();

// create order
router.post('/', authenticate, validate( createOrder), createOrder);

// get order history
router.get('/', authenticate, getOrderHistory);

// get order
router.get('/:orderId', authenticate, getOrder);

export default router;

