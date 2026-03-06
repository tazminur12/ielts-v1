import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Section from "@/models/Section";
import Test from "@/models/Test";
import { uploadToS3 } from "@/lib/s3Upload";

const ADMIN_ROLES = ["admin", "super-admin", "staff"];

// GET /api/admin/sections?testId=xxx
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ADMIN_ROLES.includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const testId = new URL(req.url).searchParams.get("testId");
    if (!testId) {
      return NextResponse.json({ message: "testId is required" }, { status: 400 });
    }

    const sections = await Section.find({ testId }).sort({ order: 1 }).lean();
    return NextResponse.json(sections);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// POST /api/admin/sections — create section (supports multipart for audio upload)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ADMIN_ROLES.includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const contentType = req.headers.get("content-type") || "";
    let data: Record<string, any> = {};
    let audioUrl: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      // Handle file upload (listening audio)
      const formData = await req.formData();
      const audioFile = formData.get("audio") as File | null;

      data = {
        testId: formData.get("testId"),
        title: formData.get("title"),
        order: Number(formData.get("order")),
        sectionType: formData.get("sectionType"),
        instructions: formData.get("instructions"),
        passageText: formData.get("passageText"),
        audioTranscript: formData.get("audioTranscript"),
        timeLimit: formData.get("timeLimit") ? Number(formData.get("timeLimit")) : undefined,
        totalQuestions: Number(formData.get("totalQuestions") || 0),
      };

      if (audioFile) {
        const arrayBuffer = await audioFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const uploaded = await uploadToS3(
          buffer,
          audioFile.name,
          audioFile.type,
          "tests/audio"
        );
        audioUrl = uploaded.url;
      }
    } else {
      data = await req.json();
    }

    if (!data.testId || !data.title || !data.sectionType) {
      return NextResponse.json(
        { message: "testId, title, and sectionType are required" },
        { status: 400 }
      );
    }

    const section = await Section.create({
      ...data,
      ...(audioUrl && { audioUrl }),
    });

    // Update test's totalQuestions if needed
    await Test.findByIdAndUpdate(data.testId, {
      $inc: { totalQuestions: data.totalQuestions || 0 },
    });

    return NextResponse.json(section, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
