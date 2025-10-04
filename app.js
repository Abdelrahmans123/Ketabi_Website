import express from "express";
import notFound from "./middlewares/notFound.js";
import errorHandler from "./middlewares/errorHandler.js";
import path from "path";
import mongoose from "mongoose";
const app = express();
const url = process.env.MONGODB_URL;

mongoose
  .connect(url)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.log("Error connecting to MongoDB", err);
  });

// Middleware to parse JSON request bodies
app.use(express.json());

/********          Routes middleware           ********/

///////////////////////////////////////////////////////////////////////////////////////////////

// Not Found
app.use(notFound);

// Error Handler
app.use(errorHandler);

export default app;
