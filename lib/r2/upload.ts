import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { galleryPublicPath } from "@/lib/paths";
import { isVercelDeployment } from "@/lib/supabase/config";

const DEFAULT_R2_REGION = "auto";
const DEFAULT_KEY_PREFIX = "videos";

function createR2Endpoint(accountId: string) {
  return `https://${accountId}.r2.cloudflarestorage.com`;
}

export function cleanR2Segment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
}

export function buildPocketBoothFrameKey(eventId: string): string {
  const keyPrefix = (
    process.env.R2_KEY_PREFIX?.trim() || DEFAULT_KEY_PREFIX
  ).replace(/^\/+|\/+$/g, "");

  return `${keyPrefix}/frames/${cleanR2Segment(eventId)}.png`;
}

function publicBaseUrl(): string {
  return (
    process.env.R2_PUBLIC_BASE_URL?.trim() ||
    process.env.R2_PUBLIC_URL?.trim() ||
    process.env.R2_BUCKET_PUBLIC_URL?.trim() ||
    process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.trim() ||
    ""
  ).replace(/\/+$/g, "");
}

export function createGuestUploadR2Client():
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
  const eventSegment = cleanR2Segment(eventId);
  const fileName = `${cleanR2Segment(mediaId)}.${cleanR2Segment(extension)}`;
  const r2 = createGuestUploadR2Client();

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

export function buildGuestUploadKey({
  keyPrefix,
  eventId,
  mediaId,
  extension,
}: {
  keyPrefix: string;
  eventId: string;
  mediaId: string;
  extension: string;
}): string {
  return `${keyPrefix}/guest/${cleanR2Segment(eventId)}/${cleanR2Segment(mediaId)}.${cleanR2Segment(extension)}`;
}

export function publicUrlForGuestUploadKey({
  publicBaseUrl,
  key,
}: {
  publicBaseUrl: string;
  key: string;
}): string {
  return `${publicBaseUrl.replace(/\/+$/g, "")}/${key}`;
}

export async function createGuestUploadSignedPutUrl({
  key,
  contentType,
}: {
  key: string;
  contentType: string;
}): Promise<{ uploadUrl: string; publicUrl: string }> {
  const r2 = createGuestUploadR2Client();

  if (!r2) {
    throw new Error(
      "Storage de upload publico nao configurado. Defina R2_PUBLIC_BASE_URL e credenciais R2.",
    );
  }

  const uploadUrl = await getSignedUrl(
    r2.client as unknown as Parameters<typeof getSignedUrl>[0],
    new PutObjectCommand({
      Bucket: r2.bucket,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 300 },
  );

  return {
    uploadUrl,
    publicUrl: publicUrlForGuestUploadKey({
      publicBaseUrl: r2.publicBaseUrl,
      key,
    }),
  };
}

export async function storePublicAssetObject({
  bytes,
  contentType,
  key,
}: {
  bytes: Buffer;
  contentType: string;
  key: string;
}): Promise<string> {
  const normalizedKey = key.replace(/^\/+|\/+$/g, "");
  const r2 = createGuestUploadR2Client();

  if (r2) {
    await r2.client.send(
      new PutObjectCommand({
        Bucket: r2.bucket,
        Key: normalizedKey,
        Body: bytes,
        ContentType: contentType,
      }),
    );

    return publicUrlForGuestUploadKey({
      publicBaseUrl: r2.publicBaseUrl,
      key: normalizedKey,
    });
  }

  if (isVercelDeployment()) {
    throw new Error(
      "Storage de upload publico nao configurado. Defina R2_PUBLIC_BASE_URL e credenciais R2.",
    );
  }

  const targetPath = path.join(galleryPublicPath(), normalizedKey);
  const relative = path.relative(galleryPublicPath(), targetPath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Caminho de asset inválido.");
  }

  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, bytes);

  return `/${normalizedKey.replace(/\\/g, "/")}`;
}
