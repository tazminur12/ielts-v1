import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Banner from "@/models/Banner";
import { withCacheHeaders } from "@/lib/httpCache";
import { redisGetJson, redisSetJson, redisDelete } from "@/lib/redisCache";

export async function GET() {
  try {
    const cacheKey = "ielts:banners:v1";
    const cached = await redisGetJson<any[]>(cacheKey);
    if (cached) {
      return withCacheHeaders(NextResponse.json(cached), {
        kind: "public",
        sMaxAge: 60,
        swr: 600,
      });
    }

    await dbConnect();
    const banners = await Banner.find({}).sort({ page: 1 }).lean();
    await redisSetJson(cacheKey, banners, 120);
    return withCacheHeaders(NextResponse.json(banners), {
      kind: "public",
      sMaxAge: 60,
      swr: 600,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch banners" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await dbConnect();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || !["super-admin", "admin"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    // upsert: if banner for this page exists, update it; otherwise create
    const banner = await Banner.findOneAndUpdate(
      { page: body.page },
      body,
      { new: true, upsert: true, runValidators: true }
    );
    await redisDelete("ielts:banners:v1");
    return withCacheHeaders(NextResponse.json(banner, { status: 201 }), { kind: "no-store" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save banner" }, { status: 500 });
  }
}
