import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Assignment from "@/models/Assignment";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { extractS3Key } from "@/lib/s3Upload";
import { getSignedDownloadUrl } from "@/lib/s3SignedUrl";
import { z } from "zod";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    const rawKey =
      (assignment as any).fileKey ||
      (typeof (assignment as any).fileUrl === "string" && (assignment as any).fileUrl.includes("amazonaws.com/")
        ? extractS3Key((assignment as any).fileUrl)
        : null);

    const downloadUrl = rawKey ? await getSignedDownloadUrl({ key: rawKey, expiresInSeconds: 3600 }) : null;

    return NextResponse.json({ ...assignment.toObject(), downloadUrl });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch assignment" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["admin", "super-admin", "staff"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const schema = z
      .object({
        title: z.string().min(1).max(100).optional(),
        type: z.enum(["listening", "reading", "writing", "speaking"]).optional(),
        difficulty: z.enum(["easy", "medium", "hard"]).optional(),
        description: z.string().max(500).optional(),
        status: z.enum(["active", "draft", "archived"]).optional(),
        fileUrl: z.string().url().optional(),
        fileKey: z.string().optional(),
        questionCount: z.number().int().min(0).optional(),
      })
      .strict();

    const parsed = schema.parse(body);

    const assignment = await Assignment.findByIdAndUpdate(id, parsed, {
      new: true,
      runValidators: true,
    });
    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }
    return NextResponse.json(assignment);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update assignment" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["admin", "super-admin", "staff"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const assignment = await Assignment.findByIdAndDelete(id);
    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete assignment" }, { status: 500 });
  }
}
