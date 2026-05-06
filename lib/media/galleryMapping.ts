import type { EventMedia, GalleryMediaRecord } from "@/types/media";
import { inferFileType, inferMediaKind } from "@/utils/mediaInference";
import { buildPublicPageUrl } from "@/lib/media/publicPageUrl";

export type RawMediaRecord = {
  id: string;
  name?: string;
  url?: string;
  videoUrl?: string;
  qrCode?: string;
  /** Alias snake_case (Supabase / PostgREST). */
  qr_code?: string;
  thumbnail?: string;
  thumbnailUrl?: string;
  /** Alias snake_case (Supabase / PostgREST). */
  thumbnail_url?: string;
  /** URLs alternativas vistas em ingestões externas. */
  public_url?: string;
  file_url?: string;
  playback_url?: string;
  src?: string;
  eventId?: string;
  eventSlug?: string;
  event_id?: string;
  event_slug?: string;
  ownerUserId?: string;
  owner_user_id?: string;
  createdAt?: unknown;
  created_at?: unknown;
  uploadedAt?: unknown;
  uploaded_at?: unknown;
  timestamp?: unknown;
  legacy_timestamp?: unknown;
  orderIndex?: unknown;
  order_index?: unknown;
  mediaType?: string;
  /** Alias snake_case (Supabase). */
  media_type?: string;
  /** Alias opcional quando a origem só expõe `video_url`. */
  video_url?: string;
  fileType?: string;
  file_type?: string;
};

const accents = [
  "from-amber-300 via-orange-500 to-fuchsia-600",
  "from-cyan-300 via-blue-500 to-violet-700",
  "from-emerald-300 via-teal-500 to-sky-700",
  "from-rose-300 via-pink-500 to-purple-700",
  "from-lime-300 via-yellow-500 to-orange-700",
  "from-indigo-300 via-violet-500 to-slate-900",
];

function parseFiniteOrderIndex(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }

  if (typeof raw === "string" && raw.trim()) {
    const n = Number(raw);

    if (Number.isFinite(n)) {
      return n;
    }
  }

  return undefined;
}

/** Converte número (epoch s ou ms) ou string ISO para ISO normalizado. */
function coerceDateField(raw: unknown): string | undefined {
  if (raw == null) {
    return undefined;
  }

  if (typeof raw === "number" && Number.isFinite(raw)) {
    const ms = raw > 0 && raw < 1e12 ? Math.floor(raw * 1000) : Math.floor(raw);

    return new Date(ms).toISOString();
  }

  if (typeof raw === "string" && raw.trim()) {
    const parsed = Date.parse(raw);

    if (Number.isFinite(parsed)) {
      return new Date(parsed).toISOString();
    }
  }

  return undefined;
}

function legacyStringDate(raw: unknown): string | undefined {
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim();
  }

  return undefined;
}

export function isMediaLike(item: unknown): item is RawMediaRecord {
  if (!item || typeof item !== "object") {
    return false;
  }

  const o = item as Record<string, unknown>;

  const primary =
    typeof o.url === "string"
      ? o.url
      : typeof o.videoUrl === "string"
        ? o.videoUrl
        : typeof o.video_url === "string"
          ? o.video_url
          : typeof o.public_url === "string"
            ? o.public_url
            : typeof o.file_url === "string"
              ? o.file_url
              : "";

  const idOk = typeof o.id === "string" && o.id.trim().length > 0;
  const urlOk = primary.trim().length > 0;

  return idOk && urlOk;
}

export function toGalleryRecord(raw: RawMediaRecord): GalleryMediaRecord {
  const url = (
    raw.url ??
    raw.videoUrl ??
    raw.video_url ??
    raw.public_url ??
    raw.file_url ??
    raw.playback_url ??
    raw.src ??
    ""
  ).trim();
  const thumbnailUrlRaw = (
    raw.thumbnailUrl ??
    raw.thumbnail ??
    raw.thumbnail_url
  )?.trim();
  const thumbnailUrl = thumbnailUrlRaw || undefined;
  const explicitMediaType = raw.mediaType ?? raw.media_type;
  const explicitFileType = raw.fileType ?? raw.file_type;
  const mediaType = inferMediaKind(explicitMediaType, explicitFileType, url);
  const fileType = inferFileType(mediaType, explicitFileType, url);
  const createdAt =
    coerceDateField(raw.createdAt) ??
    coerceDateField(raw.created_at) ??
    legacyStringDate(raw.createdAt) ??
    legacyStringDate(raw.created_at);
  const uploadedAt =
    coerceDateField(raw.uploadedAt) ??
    coerceDateField(raw.uploaded_at) ??
    legacyStringDate(raw.uploadedAt) ??
    legacyStringDate(raw.uploaded_at);
  const timestamp =
    coerceDateField(raw.timestamp) ??
    coerceDateField(raw.legacy_timestamp) ??
    legacyStringDate(raw.timestamp) ??
    legacyStringDate(raw.legacy_timestamp);

  const eventId =
    raw.eventId?.trim() ?? raw.event_id?.trim() ?? "";
  const eventSlug =
    raw.eventSlug?.trim() ?? raw.event_slug?.trim() ?? "";

  const qrCodeValue = (
    raw.qrCode?.trim() ||
    raw.qr_code?.trim() ||
    ""
  ).trim();

  const ownerUserIdRaw =
    raw.ownerUserId?.trim() ||
    (typeof raw.owner_user_id === "string" ? raw.owner_user_id.trim() : "");

  return {
    id: raw.id,
    eventId,
    eventSlug,
    name: raw.name?.trim() || "Mídia",
    url,
    qrCode: qrCodeValue,
    thumbnailUrl,
    mediaType,
    fileType,
    createdAt,
    uploadedAt,
    timestamp,
    orderIndex:
      parseFiniteOrderIndex(raw.orderIndex) ??
      parseFiniteOrderIndex(raw.order_index),
    ...(ownerUserIdRaw ? { ownerUserId: ownerUserIdRaw } : {}),
  };
}

function uiDurationLabel(mediaType: GalleryMediaRecord["mediaType"]): string {
  if (mediaType === "video") {
    return "Vídeo";
  }

  if (mediaType === "gif") {
    return "GIF";
  }

  return "Foto";
}

export function toEventMedia(
  record: GalleryMediaRecord,
  eventName: string,
  index: number,
): EventMedia {
  const pageUrl = buildPublicPageUrl(`/video/${encodeURIComponent(record.id)}`);
  const thumb = record.thumbnailUrl;
  const url = record.url;

  const qrCode = record.qrCode?.trim() ?? "";

  return {
    id: record.id,
    slug: record.id,
    title: record.name,
    event: eventName,
    eventSlug: record.eventSlug,
    mediaType: record.mediaType,
    fileType: record.fileType,
    duration: uiDurationLabel(record.mediaType),
    resolution: "Full",
    accent: accents[index % accents.length],
    url,
    videoUrl: url,
    downloadUrl: url,
    qrUrl: pageUrl,
    qrCode: qrCode || undefined,
    thumbnail: thumb,
    thumbnailUrl: thumb,
  };
}

/**
 * Converte payload do Realtime / linha Supabase em `EventMedia` para a UI.
 */
export function tryRealtimeRowToEventMedia(
  row: unknown,
  eventName: string,
  displayIndex: number,
): EventMedia | null {
  if (!isMediaLike(row)) {
    return null;
  }

  return toEventMedia(toGalleryRecord(row), eventName, displayIndex);
}
