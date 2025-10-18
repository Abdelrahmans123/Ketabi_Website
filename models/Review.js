// models/Review.js
import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    title: { type: String, trim: true, maxlength: 120 },
    body: { type: String, trim: true, maxlength: 5000 }
  },
  { timestamps: true }
);

ReviewSchema.index({ user: 1, book: 1 }, { unique: true });

ReviewSchema.statics.recalculateBookStats = async function (bookId) {
  const result = await this.aggregate([
    { $match: { book: new mongoose.Types.ObjectId(bookId) } },
    { $group: { _id: "$book", ratingsCount: { $sum: 1 }, avgRating: { $avg: "$rating" } } }
  ]);
  const { avgRating = 0, ratingsCount = 0 } = result[0] || {};
  await mongoose.model("Book").findByIdAndUpdate(
    bookId,
    { $set: { avgRating: Number(avgRating.toFixed(2)), ratingsCount } },
    { new: true }
  );
};

ReviewSchema.post("save", async function () {
  await this.constructor.recalculateBookStats(this.book);
});

async function recalcAfterQueryHook(doc) {
  if (doc?.book) await doc.constructor.recalculateBookStats(doc.book);
}
ReviewSchema.post("findOneAndUpdate", recalcAfterQueryHook);
ReviewSchema.post("findOneAndDelete", recalcAfterQueryHook);

const Review = mongoose.model("Review", ReviewSchema);
export default Review;
