import express from "express";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorization.js";
import {
  getPublishedBooks,
  getPublisherOrders,
  createPublisher
} from "../controllers/publisherController.js";
import { roleEnum } from "../utils/roleEnum.js";

const router = express.Router();

router.post("/", authenticate, authorize(roleEnum.admin), createPublisher);

router.get("/:publisherId/books", authenticate, getPublishedBooks);

router.get("/:publisherId/orders", authenticate, authorize(roleEnum.admin), getPublisherOrders);

export default router;
