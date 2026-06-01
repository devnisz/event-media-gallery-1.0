import { randomUUID } from "crypto";
import { readFile, rename, writeFile } from "fs/promises";

import { VIEW_DEDUP_WINDOW_MS } from "@/lib/analytics/constants";
import { galleryDataPath } from "@/lib/paths";
import {
  isVercelDeployment,
  logLegacyJsonWriteSkipped,
  shouldPersistLegacyJsonFiles,
} from "@/lib/supabase/config";

const ANALYTICS_SESSIONS_JSON = galleryDataPath("analytics-sessions.json");

export type ViewSessionRow = {
  key: string;
  visitorKey: string;
  lastViewedAt: string;
};

type AnalyticsSessionsFile = {
  eventGalleryViews: ViewSessionRow[];
  mediaViews: ViewSessionRow[];
};

async function atomicWriteJson(filePath: string, data: unknown) {
  const serialized = `${JSON.stringify(data, null, 2)}\n`;
  const tempPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(tempPath, serialized, "utf8");
  await rename(tempPath, filePath);
}

function emptySessions(): AnalyticsSessionsFile {
  return { eventGalleryViews: [], mediaViews: [] };
}

export async function readAnalyticsSessions(): Promise<AnalyticsSessionsFile> {
  if (!shouldPersistLegacyJsonFiles()) {
    return emptySessions();
  }

  try {
    const raw = await readFile(ANALYTICS_SESSIONS_JSON, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || typeof parsed !== "object") {
      return emptySessions();
    }

    const o = parsed as Record<string, unknown>;

    function parseRows(value: unknown, prefix: "event" | "media"): ViewSessionRow[] {
      if (!Array.isArray(value)) {
        return [];
      }

      return value
        .map((row) => {
          if (!row || typeof row !== "object") {
            return null;
          }

          const record = row as Record<string, unknown>;
          const key =
            typeof record.key === "string"
              ? record.key.trim()
              : prefix === "event" && typeof record.eventId === "string"
                ? record.eventId.trim()
                : prefix === "media" && typeof record.mediaId === "string"
                  ? record.mediaId.trim()
                  : "";
          const visitorKey =
            typeof record.visitorKey === "string"
              ? record.visitorKey.trim()
              : typeof record.visitor_key === "string"
                ? record.visitor_key.trim()
                : "";
          const lastViewedAt =
            typeof record.lastViewedAt === "string"
              ? record.lastViewedAt
              : typeof record.last_viewed_at === "string"
                ? record.last_viewed_at
                : "";

          if (!key || !visitorKey || !lastViewedAt) {
            return null;
          }

          return { key, visitorKey, lastViewedAt };
        })
        .filter((row): row is ViewSessionRow => row !== null);
    }

    return {
      eventGalleryViews: parseRows(o.eventGalleryViews, "event"),
      mediaViews: parseRows(o.mediaViews, "media"),
    };
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return emptySessions();
    }

    throw error;
  }
}

export async function writeAnalyticsSessions(
  sessions: AnalyticsSessionsFile,
): Promise<void> {
  if (!shouldPersistLegacyJsonFiles()) {
    logLegacyJsonWriteSkipped(
      isVercelDeployment()
        ? "Vercel — sem escrita em analytics-sessions.json"
        : "Supabase ativo sem dual-write JSON",
    );
    return;
  }

  await atomicWriteJson(ANALYTICS_SESSIONS_JSON, sessions);
}

export function shouldCountView(lastViewedAt: string | undefined, nowMs: number): boolean {
  if (!lastViewedAt?.trim()) {
    return true;
  }

  const parsed = Date.parse(lastViewedAt);

  if (!Number.isFinite(parsed)) {
    return true;
  }

  return nowMs - parsed >= VIEW_DEDUP_WINDOW_MS;
}

export function upsertViewSession(
  rows: ViewSessionRow[],
  key: string,
  visitorKey: string,
  nowIso: string,
): { rows: ViewSessionRow[]; counted: boolean } {
  const index = rows.findIndex(
    (row) => row.key === key && row.visitorKey === visitorKey,
  );
  const nowMs = Date.parse(nowIso);

  if (index === -1) {
    return {
      rows: [...rows, { key, visitorKey, lastViewedAt: nowIso }],
      counted: true,
    };
  }

  const existing = rows[index];

  if (!shouldCountView(existing.lastViewedAt, nowMs)) {
    const next = [...rows];
    next[index] = { ...existing, lastViewedAt: nowIso };
    return { rows: next, counted: false };
  }

  const next = [...rows];
  next[index] = { key, visitorKey, lastViewedAt: nowIso };
  return { rows: next, counted: true };
}
