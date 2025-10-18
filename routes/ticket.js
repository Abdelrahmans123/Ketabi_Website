import express from "express";
import { getAllTickets } from "../controllers/TicketController.js";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorization.js";
import { getChat } from "../socketIO/Chat/ChatController.js";
const router = express.Router();
router.get("/", authenticate, authorize("admin"), getAllTickets);
router.get("/:id", authenticate, getChat);
export default router;
