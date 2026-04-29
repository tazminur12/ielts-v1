import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Banner from "@/models/Banner";
import { withCacheHeaders } from "@/lib/httpCache";
import { redisDelete } from "@/lib/redisCache";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || !["super-admin", "admin"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const banner = await Banner.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });
    if (!banner) {
      return NextResponse.json({ error: "Banner not found" }, { status: 404 });
    }
    await redisDelete("ielts:banners:v1");
    return withCacheHeaders(NextResponse.json(banner), { kind: "no-store" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update banner" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || !["super-admin", "admin"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await Banner.findByIdAndDelete(id);
    await redisDelete("ielts:banners:v1");
    return withCacheHeaders(NextResponse.json({ success: true }), { kind: "no-store" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete banner" }, { status: 500 });
  }
}
