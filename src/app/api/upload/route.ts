import { NextRequest, NextResponse } from "next/server";
import { s3Client } from "@/lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSignedDownloadUrl } from "@/lib/s3SignedUrl";
import { z } from "zod";
import { requestLogger } from "@/lib/logger";
import { captureException } from "@/lib/sentryServer";

const ALLOWED_ROLES = ["admin", "super-admin", "staff"] as const;

const UploadMetaSchema = z.object({
  folder: z.string().optional(),
});

// Upload file server-side to avoid browser CORS issues with S3
export async function POST(req: NextRequest) {
  const log = requestLogger(req);
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ALLOWED_ROLES.includes(session.user.role as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large" }, { status: 413 });
    }

    const allowedTypes = new Set([
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "image/png",
      "image/jpeg",
      "image/webp",
    ]);

    if (file.type && !allowedTypes.has(file.type)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
    }

    const bucketName = process.env.AWS_BUCKET_NAME;
    const region = process.env.AWS_BUCKET_REGION || "us-east-1";

    if (!bucketName) {
      return NextResponse.json(
        { error: "AWS Bucket Name not configured" },
        { status: 500 }
      );
    }

    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueId = randomUUID();
    const parsed = UploadMetaSchema.safeParse({
      folder: formData.get("folder") ? String(formData.get("folder")) : undefined,
    });
    const folder = parsed.success && parsed.data.folder ? parsed.data.folder.replace(/[^a-zA-Z0-9/_-]/g, "") : "assignments";
    const safeFolder = folder.startsWith("assignments") ? folder : "assignments";
    const key = `${safeFolder}/${uniqueId}-${sanitizedFilename}`;
    const contentType = file.type || "application/octet-stream";

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload directly from server — no CORS issues
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    const fileUrl = await getSignedDownloadUrl({ key, expiresInSeconds: 3600 });

    return NextResponse.json({ fileUrl, key, expiresInSeconds: 3600, region });
  } catch (error: any) {
    log.error({ error }, "s3_upload_error");
    captureException(error, { requestId: req.headers.get("x-request-id") || "unknown", route: "/api/upload" });
    return NextResponse.json(
      { error: error.message || "Failed to upload file" },
      { status: 500 }
    );
  }
}
