import express from "express";
import {
    getProfile,
    updateProfile,
    getLibrary,
    addToWishlist,
    removeFromWishlist,
    getWishlist,
} from "../controllers/ProfileController.js";
import { authenticate } from "../middlewares/auth.js";  
import { updateProfileSchema } from "../validations/updateprofile.js";
import { validate } from "../middlewares/validation.js";

const router = express.Router();

router.get("/me", authenticate, getProfile);
router.put("/update", authenticate, updateProfile);
router.get("/library", authenticate,validate(updateProfileSchema), getLibrary);

// Wishlist routes
router.get("/wishlist", authenticate, getWishlist);
router.post("/wishlist", authenticate, addToWishlist);
router.delete("/wishlist/:bookId", authenticate, removeFromWishlist);

export default router;
