import express from "express";

import authRoutes from "./routes/auth.js";
import genreRoutes from "./routes/genre.js";
import bookRouter from "./routes/book.js";
import ticketRoutes from "./routes/ticket.js";
import { connectMongoDB, connectRedisDB } from "./config/db.js";

import errorHandler from "./middlewares/errorHandler.js";
import cartRouter from "./routes/cart.js";
import orderRouter from "./routes/order.js";
import createSessionMiddleware from "./config/session.js";
import { morganLogger } from "./middlewares/morgan.js";
import profileRouter from "./routes/profile.js";
import { initializeIO } from "./socketIO/index.js";
import couponRouter from "./routes/coupon.js";
import publisherRoutes from "./routes/publisher.js";
import reviewRoutes from "./routes/review.js";
import stripeRouter from "./controllers/webhookController.js";
import adminRefundRoutes from "./routes/adminRefund.js";
import helmet from "helmet";
import {
    cleanupOldCartsJob,
    couponExpirationJob,
    deleteUnconfirmedUsersJob,
    inactiveUserReminderJob,
} from "./jobs/cronJobs.js";
import { apiLimiter } from "./middlewares/rateLimiter.js";
import { defineCors } from "./middlewares/cors.js";
import { notFoundHandler } from "./middlewares/notFound.js";
const bootstrap = async () => {
    const app = express();
    const PORT = process.env.PORT || 3000;
    // *---MongoDB & Redis Connection---*
    await connectMongoDB();
    await connectRedisDB();
    app.use("/api/webhooks", stripeRouter);
    // *---Middlewares---*
    app.use(express.json());
    defineCors(app);
    app.use(createSessionMiddleware());
    app.use(morganLogger);
    app.use(helmet());
    app.use(apiLimiter);
    // *---Routes---*
    app.use("/webhook/stripe", stripeRouter);
    app.use("/api/auth", authRoutes);
    app.use("/api/genres", genreRoutes);
    app.use("/api/books", bookRouter);
    app.use("/api/publishers", publisherRoutes);
    app.use("/api/cart", cartRouter);
    app.use("/api/orders", orderRouter);
    app.use("/api/users", profileRouter);
    app.use("/api/coupons", couponRouter);
    app.use("/api/tickets", ticketRoutes);
    app.use("/api/reviews", reviewRoutes);
    app.use("/api/admin/refunds", adminRefundRoutes);
    // *---Error Handlers---*
    app.all("/{*dummy}", notFoundHandler);
    app.use(errorHandler);
    const server = app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        couponExpirationJob();
        deleteUnconfirmedUsersJob();
        inactiveUserReminderJob();
        cleanupOldCartsJob();
    });
    initializeIO(server);
};
export default bootstrap;
