import express from "express";
import authRoutes from "./routes/auth.js";
import genreRoutes from "./routes/genre.js";
import bookRouter from "./routes/book.js";
import { connectMongoDB, connectRedisDB } from "./config/db.js";
import HTTPStatusText from "./utils/HTTPStatusText.js";
import errorHandler from "./middlewares/errorHandler.js";
import cartRouter from "./routes/cart.js"
import orderRouter from "./routes/order.js"
import stripeRouter from './utils/stripe.js'
import createSessionMiddleware from "./config/session.js";
import { morganLogger } from "./middlewares/morgan.js"
import profileRouter  from "./routes/profile.js";
const bootstrap = async () => {
    const app = express();
    const PORT = process.env.PORT || 3000;
    await connectMongoDB();
    await connectRedisDB();
    app.use(createSessionMiddleware());
    app.use(morganLogger);
    app.use("/webhook/stripe", stripeRouter)
    app.use("/api/auth", authRoutes);
    app.use("/api/genres", genreRoutes);
    app.use("/api/books", bookRouter);
	app.use("/api/cart", cartRouter);
	app.use("/api/orders", orderRouter);
    app.use(express.json());

    app.use("/api/users", profileRouter);
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
