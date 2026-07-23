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
import { normalizeGalleryLayout, type GalleryLayout } from "@/lib/gallery/layout";
import { hashDeletePin, isValidDeletePin } from "@/lib/security/delete-pin";
import {
  cabineVirtualFieldsFromInput,
  type CabineVirtualSettingsInput,
  validateCabineVirtualSettingsInput,
} from "@/lib/virtual-booth/event-config";

export type EventGalleryDeleteSettingsInput = {
  allowPublicDelete: boolean;
  requireDeletePin: boolean;
  deletePin?: string;
  allowGuestUpload?: boolean;
  requireGuestUploadApproval?: boolean;
  galleryLayout?: GalleryLayout;
};

/** Persistência considerada ok para leitura subsequente (Supabase ou JSON local). */
export function isPersistenceSuccessful(
  persistence: PersistEventsOutcome,
): boolean {
  return (
    persistence.branch === "supabase_success" ||
    persistence.branch === "supabase_success_dual_json" ||
    persistence.branch === "json_not_configured" ||
    persistence.branch === "json_no_client"
  );
}

function assertPersistenceOk(
  persistence: PersistEventsOutcome,
  context: string,
): void {
  if (isPersistenceSuccessful(persistence)) {
    return;
  }

  const detail =
    persistence.supabaseError?.message ??
    persistence.syncFailedPhase ??
    persistence.branch;

  throw new Error(
    `Falha ao persistir eventos (${context}): ${detail}. O valor não foi gravado no banco.`,
  );
}

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
  options?: { ownerUserId?: string; allowGuestUpload?: boolean },
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
  const allowGuestUpload = options?.allowGuestUpload === true;

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
    // Default permanece false; watcher/Booth pode pedir true explicitamente.
    allowGuestUpload,
    requireGuestUploadApproval: false,
    frameUrl: "",
    galleryLayout: "premium",
    cabineVirtualEnabled: true,
    cabineVirtualPhotoEnabled: true,
    cabineVirtualBoomerangEnabled: true,
    cabineVirtualVideoEnabled: false,
    cabineVirtualVideoMaxDurationSeconds: 10,
    cabineVirtualCameraEnabled: true,
    cabineVirtualGalleryImportEnabled: true,
    liveMomentsEnabled: false,
    allowLikes: false,
    allowMediaShare: true,
    viewCount: 0,
    downloadCount: 0,
    shareCount: 0,
    ...(ownerUserId ? { ownerUserId } : {}),
  };

  events.push(record);
  const persistence = await writeEvents(events);
  assertPersistenceOk(persistence, "createEvent");

  const verified = await getEventById(record.id);
  if (!verified) {
    throw new Error(
      "Evento criado mas não encontrado na re-leitura após persistência.",
    );
  }

  if (verified.allowGuestUpload !== allowGuestUpload) {
    throw new Error(
      `allowGuestUpload não persistiu: esperado ${allowGuestUpload}, lido ${verified.allowGuestUpload}.`,
    );
  }

  return { event: verified, persistence };
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
  const requireGuestUploadApproval =
    typeof settings.requireGuestUploadApproval === "boolean"
      ? settings.requireGuestUploadApproval
      : events[idx].requireGuestUploadApproval === true;
  const galleryLayout =
    settings.galleryLayout !== undefined
      ? normalizeGalleryLayout(settings.galleryLayout)
      : normalizeGalleryLayout(events[idx].galleryLayout);
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
    requireGuestUploadApproval,
    galleryLayout,
    ...(deletePinHash ? { deletePinHash } : { deletePinHash: undefined }),
  };

  events[idx] = event;
  const persistence = await writeEvents(events);
  assertPersistenceOk(persistence, "updateEventGalleryDeleteSettings");

  const verified = await getEventById(eventId);
  if (!verified) {
    throw new Error(
      "Evento atualizado mas não encontrado na re-leitura após persistência.",
    );
  }

  if (verified.allowGuestUpload !== allowGuestUpload) {
    throw new Error(
      `allowGuestUpload não persistiu no PATCH: esperado ${allowGuestUpload}, lido ${verified.allowGuestUpload}.`,
    );
  }

  return { event: verified, persistence };
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

export async function updateEventInteractionsSettings(
  eventId: string,
  settings: { allowLikes: boolean; allowMediaShare: boolean },
): Promise<{ event: GalleryEventRecord; persistence: PersistEventsOutcome }> {
  const events = await readEvents();
  const idx = events.findIndex((e) => e.id === eventId);

  if (idx === -1) {
    throw new Error("Evento não encontrado.");
  }

  events[idx] = {
    ...events[idx],
    allowLikes: settings.allowLikes,
    allowMediaShare: settings.allowMediaShare,
  };

  const persistence = await writeEvents(events);

  return { event: events[idx], persistence };
}

export async function updateEventLikesSettings(
  eventId: string,
  enabled: boolean,
): Promise<{ event: GalleryEventRecord; persistence: PersistEventsOutcome }> {
  const events = await readEvents();
  const idx = events.findIndex((e) => e.id === eventId);

  if (idx === -1) {
    throw new Error("Evento não encontrado.");
  }

  events[idx] = {
    ...events[idx],
    allowLikes: enabled,
  };

  const persistence = await writeEvents(events);

  return { event: events[idx], persistence };
}

export async function updateEventLiveMomentsSettings(
  eventId: string,
  enabled: boolean,
): Promise<{ event: GalleryEventRecord; persistence: PersistEventsOutcome }> {
  const events = await readEvents();
  const idx = events.findIndex((e) => e.id === eventId);

  if (idx === -1) {
    throw new Error("Evento não encontrado.");
  }

  events[idx] = {
    ...events[idx],
    liveMomentsEnabled: enabled,
  };

  const persistence = await writeEvents(events);

  return { event: events[idx], persistence };
}

export async function updateEventCabineVirtualSettings(
  eventId: string,
  settings: CabineVirtualSettingsInput,
): Promise<{ event: GalleryEventRecord; persistence: PersistEventsOutcome }> {
  const validationError = validateCabineVirtualSettingsInput(settings);

  if (validationError) {
    throw new Error(validationError);
  }

  const events = await readEvents();
  const idx = events.findIndex((e) => e.id === eventId);

  if (idx === -1) {
    throw new Error("Evento não encontrado.");
  }

  events[idx] = {
    ...events[idx],
    ...cabineVirtualFieldsFromInput(settings),
  };

  const persistence = await writeEvents(events);

  return { event: events[idx], persistence };
}

export async function updateEventVirtualBoothFrameUrl(
  eventId: string,
  frameUrl: string,
): Promise<{ event: GalleryEventRecord; persistence: PersistEventsOutcome }> {
  const events = await readEvents();
  const idx = events.findIndex((e) => e.id === eventId);

  if (idx === -1) {
    throw new Error("Evento não encontrado.");
  }

  events[idx] = {
    ...events[idx],
    frameUrl: frameUrl.trim(),
  };

  const persistence = await writeEvents(events);

  return { event: events[idx], persistence };
}
