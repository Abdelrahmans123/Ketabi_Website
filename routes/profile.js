import express from "express";
import { getProfile, updateProfile, getLibrary } from "../controllers/ProfileController.js";
import { authenticate } from "../middlewares/auth.js"

const router = express.Router();

router.get("/me", authenticate, getProfile);
router.put("/update", authenticate, updateProfile);
router.get("/library", authenticate, getLibrary)

export default router;
