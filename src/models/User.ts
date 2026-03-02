import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  role: "student" | "super-admin" | "admin" | "staff";
  currentSubscriptionId?: mongoose.Types.ObjectId;
  phone?: string;
  location?: string;
  bio?: string;
  targetScore?: string;
  nextExamDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a name"],
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      select: false, // Do not return password by default
    },
    role: {
      type: String,
      enum: ["student", "super-admin", "admin", "staff"],
      default: "student",
    },
    currentSubscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
    },
    phone: {
      type: String,
    },
    location: {
      type: String,
    },
    bio: {
      type: String,
    },
    targetScore: {
      type: String,
    },
    nextExamDate: {
      type: Date,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
