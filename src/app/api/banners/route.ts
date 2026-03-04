import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Banner from "@/models/Banner";

export async function GET() {
  await dbConnect();
  try {
    const banners = await Banner.find({}).sort({ page: 1 });
    return NextResponse.json(banners);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch banners" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await dbConnect();
  try {
    const body = await req.json();
    // upsert: if banner for this page exists, update it; otherwise create
    const banner = await Banner.findOneAndUpdate(
      { page: body.page },
      body,
      { new: true, upsert: true, runValidators: true }
    );
    return NextResponse.json(banner, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save banner" }, { status: 500 });
  }
}
