import express from "express";
import { authenticate } from "../middlewares/auth.js";
import {
    addUsers,
    deleteUsers,
    getAllUsers,
    getBooksStats,
    getLowStockBooks,
    getOrdersStats,
    getRecentOrders,
    getRevenueStats,
    getUsersStats,
    updateUsers,
} from "../controllers/AdminController.js";
const router = express.Router();
router.get("/books/stats", authenticate, getBooksStats);
router.get("/orders/stats", authenticate, getOrdersStats);
router.get("/users/stats", authenticate, getUsersStats);
router.get("/revenue/stats", authenticate, getRevenueStats);
router.get("/orders/recent", authenticate, getRecentOrders);
router.get("/books/low-stock", authenticate, getLowStockBooks);
router.get("/users", authenticate, getAllUsers);
router.post("/users", authenticate, addUsers);
router.put("/users/:id", authenticate, updateUsers);
router.delete("/users/:id", authenticate, deleteUsers);
export default router;
