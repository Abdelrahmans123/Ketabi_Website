import express from "express";
import { authenticate } from "../middlewares/auth.js";
import { validate } from "../middlewares/validation.js";
import { createOrder, getOrder, getOrderHistory } from "../controllers/orderController.js"
import { createOrderSchema, getOrderSchema, getAllOrdersSchema } from "../validations/order.js";

const router = express.Router();

// create order
router.post('/', authenticate, validate( createOrderSchema), createOrder);

// get order history
router.get('/', authenticate, validate(getAllOrdersSchema), getOrderHistory);

// get order
router.get('/:orderId', authenticate, validate(getOrderSchema), getOrder);

export default router;

