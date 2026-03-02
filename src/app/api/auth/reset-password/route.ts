import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();
    if (!token || !password) {
      return NextResponse.json({ success: false, error: "Token and password are required" }, { status: 400 });
    }

    await dbConnect();

    const hashed = crypto.createHash("sha256").update(token).digest("hex");

    const user: any = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpires: { $gte: new Date() },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "Invalid or expired token" }, { status: 400 });
    }

    // Hash and set new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return NextResponse.json({ success: true, message: "Password has been reset successfully" });
  } catch (error: any) {
    console.error("Error in reset-password:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to reset password" }, { status: 500 });
  }
}
