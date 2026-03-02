import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findOne({ email });

    // To avoid leaking valid emails, always return success message. But
    // for development we will include the token in the response if found.
    if (!user) {
      return NextResponse.json({ success: true, message: "If an account exists for this email, a password reset link has been sent." });
    }

    // Generate token and expiry
    const token = crypto.randomBytes(32).toString("hex");
    const hashed = crypto.createHash("sha256").update(token).digest("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    user.resetPasswordToken = hashed;
    user.resetPasswordExpires = expires;
    await user.save();

    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/reset-password/${token}`;

    // TODO: send email with resetLink using a mailer (SendGrid, SMTP, etc.)
    console.log(`Password reset link for ${email}: ${resetLink}`);

    // In production you would not return the link. Returning here for dev/testing.
    return NextResponse.json({ success: true, message: "Password reset link generated.", resetLink });
  } catch (error: any) {
    console.error("Error in forgot-password:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to process request" }, { status: 500 });
  }
}
