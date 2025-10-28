import express from "express";
import Sale from "../models/Sale.js";

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const sales = await Sale.find()
            .populate("publisher", "name email")
            .populate("publisherOrder", "totalPrice")
            .populate("items.book", "title")
            .sort({ createdAt: -1 });
        res.json(sales);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
