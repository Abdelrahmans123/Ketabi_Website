import express from "express";
import { getProfile, updateProfile } from "../controllers/ProfileController.js";
import { authenticate } from "../middlewares/auth.js"

const router = express.Router();

router.get("/me", authenticate, getProfile);
router.put("/update", authenticate, updateProfile);

export default router;
