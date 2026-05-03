import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "@/lib/s3";

const BUCKET = process.env.AWS_BUCKET_NAME!;

export async function getSignedDownloadUrl(input: {
  key: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const cmd = new GetObjectCommand({
    Bucket: BUCKET,
    Key: input.key,
  });

  return getSignedUrl(s3Client, cmd, { expiresIn: input.expiresInSeconds ?? 3600 });
}

