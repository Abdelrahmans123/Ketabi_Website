import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import { connectMongoDB, connectRedis } from "./config/db.js";
import HTTPStatusText from "./utils/HTTPStatusText.js";
import errorHandler from "./middlewares/errorHandler.js";
import cartRouter from "./routes/cart.js"
import orderRouter from "./routes/order.js"

dotenv.config();
const bootstrap = async () => {
	const app = express();
	const PORT = process.env.PORT || 3000;
	await connectMongoDB();
	await connectRedis();
	app.use(express.json());
	app.use("/api/auth", authRoutes);
	app.use('/api/cart', cartRouter);
	app.use('/api/orders', orderRouter);
	app.all("/{*dummy}", (req, res, next) => {
		res.status(404).json({
			message: "Route Not Found",
			status: HTTPStatusText.FAILURE,
			data: null,
			code: 404,
		});
	});
	app.use(errorHandler);

	app.listen(PORT, () => {
		console.log(`Server is running on port ${PORT}`);
	});
};

export default bootstrap;
