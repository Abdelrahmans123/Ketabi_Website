import express from "express";
import { authenticate } from "../middlewares/auth.js";
import { orderSchema } from "../validations/order.js";
import { validate } from "../middlewares/validation.js";

const orderController = require("../controllers/orderController.js");
const router = express.Router();

// create order
router.post('/', authenticate, validate( orderSchema.createOrder), orderController.createOrder);

// get order history
router.get('/', authenticate, orderController.getOrderHistory);

// get order
router.get('/:orderId', authenticate, orderController.getOrder);

export default router;

