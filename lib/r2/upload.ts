import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { galleryPublicPath } from "@/lib/paths";
import { isVercelDeployment } from "@/lib/supabase/config";

const DEFAULT_R2_REGION = "auto";
const DEFAULT_KEY_PREFIX = "videos";

function createR2Endpoint(accountId: string) {
  return `https://${accountId}.r2.cloudflarestorage.com`;
}

function cleanSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
}

function publicBaseUrl(): string {
  return (
    process.env.R2_PUBLIC_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL?.trim() ||
    ""
  ).replace(/\/+$/g, "");
}

function createUploadClient():
  | { client: S3Client; bucket: string; keyPrefix: string; publicBaseUrl: string }
  | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucketName = process.env.R2_BUCKET_NAME?.trim();
  const baseUrl = publicBaseUrl();

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !baseUrl) {
    return null;
  }

  const region = process.env.R2_REGION?.trim() || DEFAULT_R2_REGION;
  const keyPrefix = (
    process.env.R2_KEY_PREFIX?.trim() || DEFAULT_KEY_PREFIX
  ).replace(/^\/+|\/+$/g, "");

  const client = new S3Client({
    region,
    endpoint: createR2Endpoint(accountId),
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return { client, bucket: bucketName, keyPrefix, publicBaseUrl: baseUrl };
}

export async function storeGuestUploadObject({
  bytes,
  contentType,
  eventId,
  mediaId,
  extension,
}: {
  bytes: Buffer;
  contentType: string;
  eventId: string;
  mediaId: string;
  extension: string;
}): Promise<string> {
  const eventSegment = cleanSegment(eventId);
  const fileName = `${cleanSegment(mediaId)}.${cleanSegment(extension)}`;
  const r2 = createUploadClient();

  if (r2) {
    const key = `${r2.keyPrefix}/guest/${eventSegment}/${fileName}`;

    await r2.client.send(
      new PutObjectCommand({
        Bucket: r2.bucket,
        Key: key,
        Body: bytes,
        ContentType: contentType,
      }),
    );

    return `${r2.publicBaseUrl}/${key}`;
  }

  if (isVercelDeployment()) {
    throw new Error(
      "Storage de upload publico nao configurado. Defina R2_PUBLIC_BASE_URL e credenciais R2.",
    );
  }

  const relativeDir = path.join("guest-uploads", eventSegment);
  const targetDir = path.join(galleryPublicPath(), relativeDir);

  await mkdir(targetDir, { recursive: true });
  await writeFile(path.join(targetDir, fileName), bytes);

  return `/api/${relativeDir.replace(/\\/g, "/")}/${fileName}`;
}
