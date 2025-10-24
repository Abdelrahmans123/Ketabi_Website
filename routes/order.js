import express from "express";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorization.js";
import { validate, queryValidate } from "../middlewares/validation.js";
import { createOrder, getOrder, getOrdersAdmin } from "../controllers/orderController.js"
import { createOrderSchema, getOrderSchema, getAllOrdersSchema } from "../validations/order.js";
import { roleEnum } from "../utils/roleEnum.js";

const router = express.Router();

// create order
router.post('/', authenticate, validate(createOrderSchema), createOrder);

// get orders
router.get('/', authenticate, authorize(roleEnum.admin), queryValidate(getAllOrdersSchema), getOrdersAdmin);

// get order
router.get('/:orderId', authenticate, validate(getOrderSchema), getOrder);

export default router;

