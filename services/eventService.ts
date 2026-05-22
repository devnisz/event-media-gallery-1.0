import type { GalleryEventRecord } from "@/types/event";
import {
  generateEventId,
  slugify,
  ensureUniqueSlug,
} from "@/utils/slug";
import { generateUniqueUploadToken } from "@/utils/generateUploadToken";
import { listPersistedEventsHydrated } from "@/services/tokenService";
import type { PersistEventsOutcome } from "@/repositories/eventRepository";
import { persistEventsFullReplace } from "@/repositories/eventRepository";
import { hashDeletePin, isValidDeletePin } from "@/lib/security/delete-pin";

export type EventGalleryDeleteSettingsInput = {
  allowPublicDelete: boolean;
  requireDeletePin: boolean;
  deletePin?: string;
  allowGuestUpload?: boolean;
};

export async function readEvents(): Promise<GalleryEventRecord[]> {
  return listPersistedEventsHydrated();
}

/**
 * Eventos visíveis no painel para um usuário autenticado.
 * Legado sem `ownerUserId`: visível a qualquer logado (migração gradual).
 */
export async function readDashboardEvents(
  userId: string,
): Promise<GalleryEventRecord[]> {
  const all = await listPersistedEventsHydrated();

  return all.filter(
    (e) => !e.ownerUserId?.trim() || e.ownerUserId === userId,
  );
}

export async function writeEvents(
  events: GalleryEventRecord[],
): Promise<PersistEventsOutcome> {
  return persistEventsFullReplace(events);
}

export async function getEventBySlug(
  slug: string,
): Promise<GalleryEventRecord | undefined> {
  const events = await readEvents();
  const needle = slug.trim().toLowerCase();

  return events.find((e) => e.slug.trim().toLowerCase() === needle);
}

export async function getEventById(
  id: string,
): Promise<GalleryEventRecord | undefined> {
  const events = await readEvents();

  return events.find((e) => e.id === id);
}

export async function createEventRecordWithPersistence(
  name: string,
  options?: { ownerUserId?: string },
): Promise<{ event: GalleryEventRecord; persistence: PersistEventsOutcome }> {
  const trimmed = name.trim();

  if (!trimmed) {
    throw new Error("Nome do evento invalido.");
  }

  const events = await readEvents();
  const takenSlugs = new Set(events.map((e) => e.slug));
  const takenTokens = new Set(events.map((e) => e.uploadToken));
  const baseSlug = slugify(trimmed);
  const slug = ensureUniqueSlug(baseSlug, takenSlugs);

  const ownerUserId = options?.ownerUserId?.trim();

  const record: GalleryEventRecord = {
    id: generateEventId(),
    name: trimmed,
    slug,
    uploadToken: generateUniqueUploadToken(takenTokens),
    createdAt: new Date().toISOString(),
    coverImage: "",
    videosCount: 0,
    allowPublicDelete: false,
    requireDeletePin: false,
    allowGuestUpload: false,
    ...(ownerUserId ? { ownerUserId } : {}),
  };

  events.push(record);
  const persistence = await writeEvents(events);

  return { event: record, persistence };
}

export async function createEventRecord(name: string): Promise<GalleryEventRecord> {
  const { event } = await createEventRecordWithPersistence(name);

  return event;
}

export async function updateEventGalleryDeleteSettings(
  eventId: string,
  settings: EventGalleryDeleteSettingsInput,
): Promise<{ event: GalleryEventRecord; persistence: PersistEventsOutcome }> {
  const events = await readEvents();
  const idx = events.findIndex((e) => e.id === eventId);

  if (idx === -1) {
    throw new Error("Evento não encontrado.");
  }

  const allowPublicDelete = settings.allowPublicDelete === true;
  const requireDeletePin =
    allowPublicDelete && settings.requireDeletePin === true;
  const allowGuestUpload =
    typeof settings.allowGuestUpload === "boolean"
      ? settings.allowGuestUpload
      : events[idx].allowGuestUpload === true;
  const trimmedPin = settings.deletePin?.trim() ?? "";
  let deletePinHash = events[idx].deletePinHash?.trim();

  if (trimmedPin) {
    if (!isValidDeletePin(trimmedPin)) {
      throw new Error("O PIN deve ter de 4 a 8 dígitos.");
    }

    deletePinHash = hashDeletePin(trimmedPin);
  }

  if (requireDeletePin && !deletePinHash) {
    throw new Error("Informe um PIN de 4 a 8 dígitos para exigir PIN.");
  }

  const event: GalleryEventRecord = {
    ...events[idx],
    allowPublicDelete,
    requireDeletePin,
    allowGuestUpload,
    ...(deletePinHash ? { deletePinHash } : { deletePinHash: undefined }),
  };

  events[idx] = event;
  const persistence = await writeEvents(events);

  return { event, persistence };
}

export async function adjustEventVideosCount(
  eventId: string,
  delta: number,
): Promise<void> {
  if (delta === 0) {
    return;
  }

  const events = await readEvents();
  const idx = events.findIndex((e) => e.id === eventId);

  if (idx === -1) {
    return;
  }

  events[idx] = {
    ...events[idx],
    videosCount: Math.max(0, events[idx].videosCount + delta),
  };

  await writeEvents(events);
}

export async function setEventCoverIfEmpty(
  eventId: string,
  coverUrl: string,
): Promise<void> {
  const trimmed = coverUrl.trim();

  if (!trimmed) {
    return;
  }

  const events = await readEvents();
  const idx = events.findIndex((e) => e.id === eventId);

  if (idx === -1) {
    return;
  }

  if (events[idx].coverImage.trim()) {
    return;
  }

  events[idx] = { ...events[idx], coverImage: trimmed };
  await writeEvents(events);
}
