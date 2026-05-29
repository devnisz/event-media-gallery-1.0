import { randomUUID } from "crypto";
import { readFile, rename, writeFile } from "fs/promises";
import { galleryDataPath } from "@/lib/paths";
import {
  isVercelDeployment,
  logLegacyJsonWriteSkipped,
  shouldPersistLegacyJsonFiles,
} from "@/lib/supabase/config";

const MEDIA_LIKES_JSON = galleryDataPath("media-likes.json");

export type StoredMediaLike = {
  mediaId: string;
  visitorKey: string;
};

async function atomicWriteJson(filePath: string, data: unknown) {
  const serialized = `${JSON.stringify(data, null, 2)}\n`;
  const tempPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(tempPath, serialized, "utf8");
  await rename(tempPath, filePath);
}

export async function readMediaLikesFromStorage(): Promise<StoredMediaLike[]> {
  if (!shouldPersistLegacyJsonFiles()) {
    return [];
  }

  try {
    const raw = await readFile(MEDIA_LIKES_JSON, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((row) => {
        if (!row || typeof row !== "object") {
          return null;
        }

        const o = row as Record<string, unknown>;
        const mediaId =
          typeof o.mediaId === "string"
            ? o.mediaId.trim()
            : typeof o.media_id === "string"
              ? o.media_id.trim()
              : "";
        const visitorKey =
          typeof o.visitorKey === "string"
            ? o.visitorKey.trim()
            : typeof o.visitor_key === "string"
              ? o.visitor_key.trim()
              : "";

        if (!mediaId || !visitorKey) {
          return null;
        }

        return { mediaId, visitorKey };
      })
      .filter((row): row is StoredMediaLike => row !== null);
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return [];
    }

    throw error;
  }
}

export async function writeMediaLikesToStorage(
  likes: StoredMediaLike[],
): Promise<void> {
  if (!shouldPersistLegacyJsonFiles()) {
    logLegacyJsonWriteSkipped(
      isVercelDeployment()
        ? "Vercel — sem escrita em media-likes.json"
        : "Supabase ativo sem dual-write JSON",
    );
    return;
  }

  await atomicWriteJson(MEDIA_LIKES_JSON, likes);
}
