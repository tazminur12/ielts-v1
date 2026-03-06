import { s3Client } from "@/lib/s3";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const BUCKET = process.env.AWS_BUCKET_NAME!;
const REGION = process.env.AWS_BUCKET_REGION || "us-east-1";

type UploadFolder = "tests/audio" | "tests/images" | "tests/speaking" | "tests/reading";

/**
 * Upload a file buffer to S3 under a given folder
 */
export async function uploadToS3(
  buffer: Buffer,
  originalName: string,
  contentType: string,
  folder: UploadFolder
): Promise<{ url: string; key: string }> {
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `${folder}/${randomUUID()}-${sanitizedName}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: "public-read",
    })
  );

  const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
  return { url, key };
}

/**
 * Delete a file from S3 by key
 */
export async function deleteFromS3(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
}

/**
 * Extract S3 key from a full S3 URL
 */
export function extractS3Key(url: string): string {
  const urlObj = new URL(url);
  return urlObj.pathname.slice(1); // remove leading "/"
}
