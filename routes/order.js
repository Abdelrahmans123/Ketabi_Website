import express from "express";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorization.js";
import { validate, queryValidate } from "../middlewares/validation.js";
import { createOrder, getOrderHistory, getOrdersAdmin } from "../controllers/orderController.js"
import { createOrderSchema, getUserOrderSchema, getAllOrdersSchema } from "../validations/order.js";
import { roleEnum } from "../utils/roleEnum.js";

const router = express.Router();

// create order for users
router.post('/', authenticate, validate(createOrderSchema), createOrder);

// get orders for admins
router.get('/', authenticate, authorize(roleEnum.admin), queryValidate(getAllOrdersSchema), getOrdersAdmin);

// get user own orders
router.get('/order-history', authenticate, queryValidate(getUserOrderSchema), getOrderHistory)

export default router;

