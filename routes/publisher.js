import express from "express";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorization.js";
import {
  getPublishedBooks,
  getPublisherOrders,
  createPublisher
} from "../controllers/publisherController.js";

const router = express.Router();

router.post("/", authenticate, authorize("admin"), createPublisher);

router.get("/:publisherId/books", authenticate, getPublishedBooks);

router.get("/:publisherId/orders", authenticate, authorize("admin"), getPublisherOrders);

export default router;
