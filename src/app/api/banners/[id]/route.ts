import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Banner from "@/models/Banner";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  try {
    const { id } = await params;
    const body = await req.json();
    const banner = await Banner.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });
    if (!banner) {
      return NextResponse.json({ error: "Banner not found" }, { status: 404 });
    }
    return NextResponse.json(banner);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update banner" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  try {
    const { id } = await params;
    await Banner.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete banner" }, { status: 500 });
  }
}
