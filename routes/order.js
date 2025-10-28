import express from "express";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorization.js";
import { validate, queryValidate } from "../middlewares/validation.js";
import {
    createOrder,
    getOrderHistory,
    getOrdersAdmin,
    updateOrderStatus,
    cancelOrder,
    getOrderById,
} from "../controllers/orderController.js";
import {
    createOrderSchema,
    getUserOrderSchema,
    getAllOrdersSchema,
} from "../validations/order.js";
import { roleEnum } from "../utils/roleEnum.js";

const router = express.Router();

// create order for users
router.post("/", authenticate, validate(createOrderSchema), createOrder);

// get orders for admins
router.get(
    "/",
    authenticate,
    authorize(roleEnum.admin),
    queryValidate(getAllOrdersSchema),
    getOrdersAdmin
);

// get user own orders
router.get(
    "/order-history",
    authenticate,
    queryValidate(getUserOrderSchema),
    getOrderHistory
);

// get single order details
router.get("/:orderId", authenticate, getOrderById);

// update order status (Admin/Publisher)
router.put(
    "/:orderId/status",
    authenticate,
    authorize(roleEnum.admin, roleEnum.publisher),
    updateOrderStatus
);

// cancel order (User/Admin)
router.put("/:orderId/cancel", authenticate, cancelOrder);

export default router;
