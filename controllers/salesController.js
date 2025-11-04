import asyncHandler from "../utils/asyncHandler.js";
import Sale from "../models/Sale.js";
import { paymentMethods } from "../utils/orderEnums.js";

export const getSalesAdmin = asyncHandler(async (req, res, next) => {

    const { paymentMethod = paymentMethods.STRIPE, page = 1, limit = 10 } = req.query;
    const query = paymentMethod === "ALL" ? {} : { paymentMethod };

    const sales = await Sale.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await Sale.countDocuments(query);

    res.status(200).json({
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
        data: sales,
    });

})

/*     try {
        const sales = await Sale.find()
            .populate("user", "name email")
            .populate("publisherOrder", "totalPrice")
            .populate("items.book", "name")
            .sort({ createdAt: -1 });
        res.json(sales);
    } catch (err) {
        res.status(500).json({ message: err.message });
    } */