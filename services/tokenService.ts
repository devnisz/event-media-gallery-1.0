/**
 * Serviço de tokens de upload — validação estilo backend para watcher/API.
 */
import { timingSafeEqual } from "crypto";
import type { GalleryEventRecord } from "@/types/event";
import {
  readEventsFromStorage,
  writeEventsToStorage,
} from "@/services/storageService";
import { generateUniqueUploadToken } from "@/utils/generateUploadToken";

/** Linha persistida antes da migração de uploadToken. */
export type StoredEventLoose = Omit<GalleryEventRecord, "uploadToken"> & {
  uploadToken?: string;
};

export function hydrateAssignTokens(
  events: StoredEventLoose[],
): { next: GalleryEventRecord[]; changed: boolean } {
  const taken = new Set<string>();

  for (const e of events) {
    const t = e.uploadToken?.trim();

    if (t) {
      taken.add(t);
    }
  }

  let changed = false;

  const next: GalleryEventRecord[] = events.map((e) => {
    const trimmedExisting = e.uploadToken?.trim();

    if (trimmedExisting) {
      return {
        id: e.id,
        name: e.name,
        slug: e.slug,
        createdAt: e.createdAt,
        coverImage: e.coverImage ?? "",
        videosCount: typeof e.videosCount === "number" ? e.videosCount : 0,
        uploadToken: trimmedExisting,
      };
    }

    changed = true;
    const uploadToken = generateUniqueUploadToken(taken);

    taken.add(uploadToken);

    return {
      id: e.id,
      name: e.name,
      slug: e.slug,
      createdAt: e.createdAt,
      coverImage: e.coverImage ?? "",
      videosCount: typeof e.videosCount === "number" ? e.videosCount : 0,
      uploadToken,
    };
  });

  return { next, changed };
}

/** Garante `uploadToken` em todos os eventos e persiste se necessário. */
export async function listPersistedEventsHydrated(): Promise<
  GalleryEventRecord[]
> {
  const raw = await readEventsFromStorage();
  const { next, changed } = hydrateAssignTokens(raw as StoredEventLoose[]);

  if (changed) {
    await writeEventsToStorage(next);
  }

  return next;
}

export type ValidateWatcherResult =
  | {
      ok: true;
      event: Pick<GalleryEventRecord, "id" | "slug" | "name">;
    }
  | {
      ok: false;
      code:
        | "EVENT_NOT_FOUND"
        | "TOKEN_MISSING"
        | "TOKEN_MISMATCH"
        | "TOKEN_NOT_CONFIGURED";
    };

export function compareUploadTokens(secret: string, presented: string): boolean {
  const a = Buffer.from(secret, "utf8");
  const b = Buffer.from(presented.trim(), "utf8");

  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
}

/** Valida par eventId + uploadToken contra `events.json` (após hidratação). */
export async function validateWatcherCredentials(
  eventId: string,
  uploadToken: string,
): Promise<ValidateWatcherResult> {
  const trimmedId = eventId.trim();
  const trimmedToken = uploadToken.trim();

  if (!trimmedId) {
    return { ok: false, code: "EVENT_NOT_FOUND" };
  }

  if (!trimmedToken) {
    return { ok: false, code: "TOKEN_MISSING" };
  }

  const events = await listPersistedEventsHydrated();
  const event = events.find((e) => e.id === trimmedId);

  if (!event) {
    return { ok: false, code: "EVENT_NOT_FOUND" };
  }

  if (!event.uploadToken?.trim()) {
    return { ok: false, code: "TOKEN_NOT_CONFIGURED" };
  }

  if (!compareUploadTokens(event.uploadToken, trimmedToken)) {
    return { ok: false, code: "TOKEN_MISMATCH" };
  }

  return {
    ok: true,
    event: { id: event.id, slug: event.slug, name: event.name },
  };
}
