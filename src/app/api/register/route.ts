import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { getClientIp } from "@/lib/clientIp";
import { rateLimitOrThrow } from "@/lib/ratelimit";
import { withCacheHeaders } from "@/lib/httpCache";

export async function POST(req: Request) {
  try {
    await rateLimitOrThrow(getClientIp(req), "register");
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    await connectDB();

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "student", // Default role
    });

    return withCacheHeaders(
      NextResponse.json(
      { message: "User created successfully", user: { id: user._id, name: user.name, email: user.email, role: user.role } },
      { status: 201 }
      ),
      { kind: "no-store" }
    );
  } catch (error: any) {
    if (error?.message === "rate_limited") {
      const retryAfter = Number(error?.retryAfter || 30);
      return NextResponse.json(
        { message: "Too many requests. Please try again." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }
    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
