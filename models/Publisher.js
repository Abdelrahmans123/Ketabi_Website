import mongoose from "mongoose";

const publisherSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true, trim: true },
        email: { type: String, required: true, unique: true },
        contactNumber: { type: String },
        address: { type: String },
        booksPublished: [

            { type: mongoose.Schema.Types.ObjectId, ref: "Book" }

        ],
        createdAt: { type: Date, default: Date.now }
    },


    { timestamps: true }

);
const Publisher = mongoose.model("Publisher", publisherSchema);
export default Publisher;