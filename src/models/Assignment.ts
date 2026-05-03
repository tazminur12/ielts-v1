import mongoose from "mongoose";

const AssignmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please provide a title for the assignment"],
      maxlength: [100, "Title cannot be more than 100 characters"],
    },
    type: {
      type: String,
      required: [true, "Please specify the assignment type"],
      enum: ["listening", "reading", "writing", "speaking"],
    },
    difficulty: {
      type: String,
      required: [true, "Please specify the difficulty level"],
      enum: ["easy", "medium", "hard"],
    },
    fileUrl: {
      type: String,
      required: false,
    },
    fileKey: {
      type: String,
      required: false,
    },
    description: {
      type: String,
      required: false,
      maxlength: [500, "Description cannot be more than 500 characters"],
    },
    createdBy: {
      type: String, // You might want to reference a User model here later
      default: "Admin", 
    },
    status: {
      type: String,
      enum: ["active", "draft", "archived"],
      default: "active",
    },
    questionCount: {
        type: Number,
        default: 0
    }
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Assignment || mongoose.model("Assignment", AssignmentSchema);
