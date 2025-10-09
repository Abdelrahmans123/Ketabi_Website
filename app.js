import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import { connectMongoDB, connectRedisDB } from "./config/db.js";
import HTTPStatusText from "./utils/HTTPStatusText.js";
import errorHandler from "./middlewares/errorHandler.js";
import appSession from "./config/session.js";
import { morganLogger } from "./middlewares/morgan.js"

dotenv.config();
const bootstrap = async () => {
    const app = express();
    const PORT = process.env.PORT || 3000;
    await connectMongoDB();
    await connectRedisDB();
    app.use(appSession);
    app.use(express.json());
    app.use(morganLogger);
    app.use("/api/auth", authRoutes);
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
