import type { GalleryEventRecord } from "@/types/event";
import {
  generateEventId,
  slugify,
  ensureUniqueSlug,
} from "@/utils/slug";
import { generateUniqueUploadToken } from "@/utils/generateUploadToken";
import { listPersistedEventsHydrated } from "@/services/tokenService";
import {
  writeEventsToStorage,
} from "@/services/storageService";

export async function readEvents(): Promise<GalleryEventRecord[]> {
  return listPersistedEventsHydrated();
}

export async function writeEvents(events: GalleryEventRecord[]) {
  await writeEventsToStorage(events);
}

export async function getEventBySlug(
  slug: string,
): Promise<GalleryEventRecord | undefined> {
  const events = await readEvents();

  return events.find((e) => e.slug === slug);
}

export async function getEventById(
  id: string,
): Promise<GalleryEventRecord | undefined> {
  const events = await readEvents();

  return events.find((e) => e.id === id);
}

export async function createEventRecord(name: string): Promise<GalleryEventRecord> {
  const trimmed = name.trim();

  if (!trimmed) {
    throw new Error("Nome do evento invalido.");
  }

  const events = await readEvents();
  const takenSlugs = new Set(events.map((e) => e.slug));
  const takenTokens = new Set(events.map((e) => e.uploadToken));
  const baseSlug = slugify(trimmed);
  const slug = ensureUniqueSlug(baseSlug, takenSlugs);

  const record: GalleryEventRecord = {
    id: generateEventId(),
    name: trimmed,
    slug,
    uploadToken: generateUniqueUploadToken(takenTokens),
    createdAt: new Date().toISOString(),
    coverImage: "",
    videosCount: 0,
  };

  events.push(record);
  await writeEvents(events);

  return record;
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
