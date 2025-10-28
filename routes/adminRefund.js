import express from "express";
import {
  getRefunds,
  updateRefundStatus,
  processRefund,
} from "../controllers/refundController.js";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorization.js";
import { roleEnum } from "../utils/roleEnum.js";

const router = express.Router();

router.get("/",authenticate, authorize(roleEnum.admin), getRefunds); 
router.patch("/:id", authenticate, authorize(roleEnum.admin), updateRefundStatus); 
router.post("/:id/refund", authenticate, authorize(roleEnum.admin), processRefund);

export default router;