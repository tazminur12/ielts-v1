import mongoose from "mongoose";

const BannerSchema = new mongoose.Schema(
  {
    page: {
      type: String,
      required: [true, "Please specify the page"],
      enum: ["home", "about"],
      unique: true,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    title: {
      type: String,
      required: [true, "Please provide a title"],
      maxlength: [150, "Title cannot be more than 150 characters"],
    },
    subtitle: {
      type: String,
      default: "",
      maxlength: [300, "Subtitle cannot be more than 300 characters"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: String,
      default: "Admin",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Banner ||
  mongoose.model("Banner", BannerSchema);
