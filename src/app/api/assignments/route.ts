import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Assignment from "@/models/Assignment";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { extractS3Key } from "@/lib/s3Upload";
import { getSignedDownloadUrl } from "@/lib/s3SignedUrl";
import { z } from "zod";

export async function GET() {
  await dbConnect();

  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const assignments = await Assignment.find({}).lean();

    const enriched = await Promise.all(
      assignments.map(async (a: any) => {
        const rawKey =
          a.fileKey ||
          (typeof a.fileUrl === "string" && a.fileUrl.includes("amazonaws.com/") ? extractS3Key(a.fileUrl) : null);
        const downloadUrl = rawKey ? await getSignedDownloadUrl({ key: rawKey, expiresInSeconds: 3600 }) : null;
        return { ...a, downloadUrl };
      })
    );

    return NextResponse.json(enriched);
  } catch (error) {
    return NextResponse.json(
      { success: false },
      { status: 400 }
    );
  }
}

export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const session = await getServerSession(authOptions);
    if (!session || !["admin", "super-admin", "staff"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const schema = z.object({
      title: z.string().min(1).max(100),
      type: z.enum(["listening", "reading", "writing", "speaking"]),
      difficulty: z.enum(["easy", "medium", "hard"]),
      description: z.string().max(500).optional(),
      status: z.enum(["active", "draft", "archived"]).optional(),
      fileUrl: z.string().url().optional(),
      fileKey: z.string().optional(),
      questionCount: z.number().int().min(0).optional(),
    });

    const parsed = schema.parse(body);
    const assignment = await Assignment.create({
      ...parsed,
      createdBy: session.user.email || session.user.name || "Admin",
    });
    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false },
      { status: 400 }
    );
  }
}
