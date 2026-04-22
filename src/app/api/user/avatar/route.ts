import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

function isAllowedMime(mime: string) {
  return ["image/png", "image/jpeg", "image/webp"].includes(mime);
}

function extFromMime(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return "bin";
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ success: false, error: "Missing file" }, { status: 400 });
    }

    if (!isAllowedMime(file.type)) {
      return NextResponse.json(
        { success: false, error: "Only PNG/JPG/WEBP allowed" },
        { status: 400 }
      );
    }

    const maxBytes = 2 * 1024 * 1024; // 2MB
    if (file.size > maxBytes) {
      return NextResponse.json(
        { success: false, error: "Max file size is 2MB" },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = extFromMime(file.type);

    const hasS3Config =
      Boolean(process.env.AWS_BUCKET_NAME) &&
      Boolean(process.env.AWS_ACCESS_KEY_ID) &&
      Boolean(process.env.AWS_SECRET_ACCESS_KEY);

    if (!hasS3Config) {
      return NextResponse.json(
        {
          success: false,
          error:
            "S3 is not configured. Set AWS_BUCKET_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (and optionally AWS_BUCKET_REGION).",
        },
        { status: 500 }
      );
    }

    // Dynamic import so local dev without AWS creds doesn't crash on module load.
    const { uploadToS3 } = await import("@/lib/s3Upload");
    const result = await uploadToS3(bytes, `avatar.${ext}`, file.type, "users/avatars");
    const publicUrl = result.url;

    await dbConnect();
    const updated = await User.findByIdAndUpdate(
      session.user.id,
      { $set: { image: publicUrl } },
      { new: true, select: "-password" }
    );

    return NextResponse.json({ success: true, data: { image: publicUrl, user: updated } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to upload avatar";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

