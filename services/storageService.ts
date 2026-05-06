/**
 * Camada de persistência local (JSON). Substituível por adapter Supabase
 * mantendo os services de domínio (event/video) inalterados.
 */
import { randomUUID } from "crypto";
import { readFile, rename, writeFile } from "fs/promises";
import { galleryDataPath } from "@/lib/paths";
import {
  isVercelDeployment,
  logLegacyJsonWriteSkipped,
  shouldPersistLegacyJsonFiles,
} from "@/lib/supabase/config";
import type { GalleryEventRecord } from "@/types/event";

const EVENTS_JSON = galleryDataPath("events.json");
const VIDEOS_JSON = galleryDataPath("videos.json");

async function atomicWriteJson(filePath: string, data: unknown) {
  const serialized = `${JSON.stringify(data, null, 2)}\n`;
  const tempPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(tempPath, serialized, "utf8");
  await rename(tempPath, filePath);
}

export async function readEventsFromStorage(): Promise<GalleryEventRecord[]> {
  try {
    const raw = await readFile(EVENTS_JSON, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    return Array.isArray(parsed) ? (parsed as GalleryEventRecord[]) : [];
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

export async function writeEventsToStorage(
  events: GalleryEventRecord[],
): Promise<void> {
  if (!shouldPersistLegacyJsonFiles()) {
    logLegacyJsonWriteSkipped(
      isVercelDeployment()
        ? "Vercel — sem escrita em data/"
        : "Supabase ativo sem dual-write JSON",
    );
    return;
  }

  await atomicWriteJson(EVENTS_JSON, events);
}

/** Lê array bruto de `videos.json` (normalização em `mediaService`). */
export async function readVideosJsonRaw(): Promise<unknown[]> {
  try {
    const file = await readFile(VIDEOS_JSON, "utf8");
    const parsed = JSON.parse(file) as unknown;

    return Array.isArray(parsed) ? parsed : [];
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

export async function writeVideosToStorage(
  videos: unknown[],
): Promise<void> {
  if (!shouldPersistLegacyJsonFiles()) {
    logLegacyJsonWriteSkipped(
      isVercelDeployment()
        ? "Vercel — sem escrita em data/"
        : "Supabase ativo sem dual-write JSON",
    );
    return;
  }

  await atomicWriteJson(VIDEOS_JSON, videos);
}
