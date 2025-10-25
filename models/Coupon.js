import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
    code: {type: String, required: true, unique: true},
    description: {type: String, required: true},
    discountPercentage: {type: Number, required:true, min: [0, "Minimum discount is 0%"], max: [100, "Maximum discount is 100%"]},
    minOrderValue: {type: Number, required:true, min: [0, "Minimum order value is 0"]},
    expiryDate: {type: Date, required:true},
    usageLimit: {type: Number, requried: true},
    isActive: {type: Boolean, required:true},
    numOfUsers: {type: Number, default: 0}
}, {timestamps:true});



const Coupon = mongoose.model('Coupon', couponSchema);

export default Coupon;
