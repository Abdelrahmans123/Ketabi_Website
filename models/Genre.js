// models/Genre.js
import mongoose from "mongoose";
import slugify from "slugify";

const genreSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Genre name is required"],
      trim: true,
      unique:true,
    },
    slug: {
      type: String,
      unique: true,
    },
    description: {
      type: String,
      default: "",
    },
  },
  { timestamps: true } 
);

genreSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

genreSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  
  if (update.name) {
    update.slug = slugify(update.name, { lower: true, strict: true });
    this.setUpdate(update);
  }

  next();
});


export default mongoose.model("Genre", genreSchema);
