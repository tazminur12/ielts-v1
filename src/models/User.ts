import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  role: "student" | "super-admin" | "admin" | "staff";
  currentSubscriptionId?: mongoose.Types.ObjectId;
  image?: string;
  passportName?: string;
  phone?: string;
  location?: string;
  bio?: string;
  targetScore?: string;
  nextExamDate?: Date;
  dateOfBirth?: Date;
  gender?: string;
  nationality?: string;
  firstLanguage?: string;
  timeZone?: string;
  preferredExamType?: "Academic" | "General Training";
  targetTestDate?: Date;
  practiceReason?: "study_abroad" | "immigration" | "job_requirements" | "other";
  hasIeltsScore?: boolean;
  ieltsScore?: string;
  country?: string;
  currency?: string;
  acceptedTerms?: boolean;
  onboardingCompletedAt?: Date;
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
    image: {
      type: String,
    },
    passportName: {
      type: String,
      trim: true,
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
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
    },
    nationality: {
      type: String,
    },
    firstLanguage: {
      type: String,
    },
    timeZone: {
      type: String,
    },
    preferredExamType: {
      type: String,
      enum: ["Academic", "General Training"],
    },
    targetTestDate: {
      type: Date,
    },
    practiceReason: {
      type: String,
      enum: ["study_abroad", "immigration", "job_requirements", "other"],
    },
    hasIeltsScore: {
      type: Boolean,
    },
    ieltsScore: {
      type: String,
    },
    country: {
      type: String,
      trim: true,
    },
    currency: {
      type: String,
      trim: true,
    },
    acceptedTerms: {
      type: Boolean,
      default: false,
    },
    onboardingCompletedAt: {
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

const existing = mongoose.models.User as Model<IUser> | undefined;
const hasOnboardingPath = Boolean((existing?.schema as any)?.path?.("onboardingCompletedAt"));

// In Next.js dev, the model can be cached across HMR. If the schema changed,
// we must delete and re-register so new fields are persisted.
if (existing && !hasOnboardingPath) {
  try {
    mongoose.deleteModel("User");
  } catch {
    // ignore if already deleted / not supported
    delete (mongoose.models as any).User;
  }
}

const User: Model<IUser> = (mongoose.models.User as Model<IUser> | undefined) || mongoose.model<IUser>("User", UserSchema);

export default User;
