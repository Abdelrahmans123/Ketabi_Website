import dotenv from "dotenv";
dotenv.config();
import session from "express-session";
import { RedisStore } from "connect-redis";
import { redisClient } from "./db.js";


let redisStore = new RedisStore({
    client: redisClient,
    prefix: "myapp:",
});

const sessionConfig = {
    store: redisStore,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000,
    },
};
const appSession = session(sessionConfig);

export default appSession;
