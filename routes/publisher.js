import express from "express";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorization.js";
import {
  getPublishedBooks,
  getPublisherOrders,
  createPublisher,
  updatePublisherOrder
} from "../controllers/publisherController.js";
import { roleEnum } from "../utils/roleEnum.js";

const router = express.Router();

router.post("/", authenticate, authorize(roleEnum.admin), createPublisher);

router.get("/:publisherId/books", getPublishedBooks);

router.get("/:publisherId/orders", authenticate, authorize(roleEnum.admin, roleEnum.publisher), getPublisherOrders);

router.patch("/:publisherOrderId", authenticate, authorize(roleEnum.publisher, roleEnum.admin), updatePublisherOrder);


export default router;
