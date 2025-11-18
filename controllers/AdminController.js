import Book from "../models/Book.js";
import { Order } from "../models/Order.js";
import User from "../models/User.js";
import { orderStatus, paymentStatus } from "../utils/orderEnums.js";

export const getBooksStats = async (req, res) => {
    try {
        const totalBooks = await Book.countDocuments();
        const booksByGenre = await Book.aggregate([
            {
                $group: {
                    _id: "$genre",
                    count: { $sum: 1 },
                },
            },
        ]);
        res.status(200).json({
            totalBooks,
            booksByGenre,
        });
    } catch (error) {
        console.error("Error fetching book stats:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
export const getOrdersStats = async (req, res) => {
    const totalOrders = await Order.countDocuments();
    res.status(200).json({ totalOrders });
};
export const getUsersStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        res.status(200).json({
            totalUsers,
        });
    } catch (error) {
        console.error("Error fetching user stats:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
export const getRevenueStats = async (req, res) => {
    try {
        const result = await Order.aggregate([
            {
                $match: {
                    paymentStatus: paymentStatus.COMPLETED,
                    orderStatus: { $ne: orderStatus.CANCELLED },
                },
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$finalPrice" },
                    totalOrders: { $sum: 1 },
                    averageOrderValue: { $avg: "$finalPrice" },
                },
            },
        ]);

        const stats = result[0] || {
            totalRevenue: 0,
            totalOrders: 0,
            averageOrderValue: 0,
        };

        res.status(200).json({
            success: true,
            totalRevenue: stats.totalRevenue,
            totalOrders: stats.totalOrders,
            averageOrderValue: parseFloat(stats.averageOrderValue.toFixed(2)),
        });
    } catch (error) {
        console.error("Error fetching revenue stats:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};
export const getRecentOrders = async (req, res) => {
    try {
        const recentOrders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate("user", "name email");

        res.status(200).json({
            success: true,
            recentOrders,
        });
    } catch (error) {
        console.error("Error fetching recent orders:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};
// AdminController.js - Add this function
export const getLowStockBooks = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const threshold = parseInt(req.query.threshold) || 10; // Stock threshold

        const lowStockBooks = await Book.find({
            stock: { $lte: threshold, $gt: 0 },
        })
            .sort({ stock: 1 })
            .limit(limit)
            .select("name author stock price image");

        res.status(200).json({
            success: true,
            lowStockBooks,
        });
    } catch (error) {
        console.error("Error fetching low stock books:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select(
            "name email role gender status createdAt"
        );
        res.status(200).json({
            success: true,
            users,
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};
export const addUsers = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "User with this email already exists",
            });
        }

        const newUser = new User({ name, email, password, role });
        await newUser.save();

        res.status(201).json({
            success: true,
            message: "User added successfully",
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
            },
        });
    } catch (error) {
        console.error("Error adding user:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};
export const updateUsers = async (req, res) => {
    try {
        const userId = req.params.id;
        const { name, email, role, gender, status } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        user.name = name || user.name;
        user.email = email || user.email;
        user.role = role || user.role;
        user.gender = gender || user.gender;
        user.status = status || user.status;

        await user.save();

        res.status(200).json({
            success: true,
            message: "User updated successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};
export const deleteUsers = async (req, res) => {
    try {
        const userId = req.params.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        await User.deleteOne({ _id: userId });

        res.status(200).json({
            success: true,
            message: "User deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};
