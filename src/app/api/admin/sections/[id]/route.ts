import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Section from "@/models/Section";
import { uploadToS3 } from "@/lib/s3Upload";

const ADMIN_ROLES = ["admin", "super-admin", "staff"];

// PATCH /api/admin/sections/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ADMIN_ROLES.includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const contentType = req.headers.get("content-type") || "";
    let updates: Record<string, any> = {};

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const audioFile = formData.get("audio") as File | null;

      const fields = [
        "title", "order", "instructions", "passageText",
        "audioTranscript", "timeLimit", "totalQuestions",
      ];
      fields.forEach((f) => {
        const val = formData.get(f);
        if (val !== null) updates[f] = f === "order" || f === "timeLimit" || f === "totalQuestions" ? Number(val) : val;
      });

      if (audioFile) {
        const arrayBuffer = await audioFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const uploaded = await uploadToS3(buffer, audioFile.name, audioFile.type, "tests/audio");
        updates.audioUrl = uploaded.url;
      }
    } else {
      updates = await req.json();
    }

    const section = await Section.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!section) {
      return NextResponse.json({ message: "Section not found" }, { status: 404 });
    }

    return NextResponse.json(section);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/sections/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ADMIN_ROLES.includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const section = await Section.findByIdAndDelete(id);
    if (!section) {
      return NextResponse.json({ message: "Section not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Section deleted" });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
