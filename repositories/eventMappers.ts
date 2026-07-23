/**
 * Mappers domínio ↔ banco para `events`.
 * Mantém simetria explícita de booleans (evita omitir chaves no upsert PostgREST).
 */
import { normalizeGalleryLayout } from "@/lib/gallery/layout";
import { clampVideoMaxDurationSeconds } from "@/lib/virtual-booth/event-config";
import type { GalleryEventRecord, StoredEventLoose } from "@/types/event";

export type EventRow = {
  id: string;
  slug: string;
  name: string;
  upload_token: string;
  created_at: string;
  cover_image: string | null;
  videos_count: number | null;
  owner_user_id: string | null;
  allow_public_delete: boolean;
  require_delete_pin: boolean;
  delete_pin_hash: string | null;
  allow_guest_upload: boolean;
  require_guest_upload_approval: boolean;
  frame_url: string;
  gallery_layout: string;
  cabine_virtual_enabled: boolean;
  cabine_virtual_photo_enabled: boolean;
  cabine_virtual_boomerang_enabled: boolean;
  cabine_virtual_video_enabled: boolean;
  cabine_virtual_video_max_duration_seconds: number;
  cabine_virtual_camera_enabled: boolean;
  cabine_virtual_gallery_import_enabled: boolean;
  live_moments_enabled: boolean;
  allow_likes: boolean;
  allow_media_share: boolean;
  view_count: number;
  download_count: number;
  share_count: number;
};

/** Lê boolean do banco: só `true`/`false` literais; resto → false (NOT NULL default). */
export function booleanFromDb(value: unknown): boolean {
  return value === true;
}

/** Serializa boolean de domínio para coluna NOT NULL (nunca undefined/null). */
export function booleanToDb(value: unknown): boolean {
  return value === true;
}

function optionalTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Banco → domínio (StoredEventLoose / GalleryEventRecord parcial). */
export function rowToLoose(row: EventRow | Record<string, unknown>): StoredEventLoose {
  const r = row as EventRow;
  const deletePinHash = optionalTrimmedString(r.delete_pin_hash);

  return {
    id: String(r.id),
    name: String(r.name),
    slug: String(r.slug),
    createdAt: String(r.created_at),
    uploadToken: String(r.upload_token),
    coverImage: r.cover_image ?? "",
    videosCount: typeof r.videos_count === "number" ? r.videos_count : 0,
    allowPublicDelete: booleanFromDb(r.allow_public_delete),
    requireDeletePin: booleanFromDb(r.require_delete_pin),
    allowGuestUpload: booleanFromDb(r.allow_guest_upload),
    requireGuestUploadApproval: booleanFromDb(r.require_guest_upload_approval),
    frameUrl: optionalTrimmedString(r.frame_url),
    galleryLayout: normalizeGalleryLayout(r.gallery_layout),
    ...(typeof r.cabine_virtual_enabled === "boolean"
      ? { cabineVirtualEnabled: r.cabine_virtual_enabled }
      : {}),
    ...(typeof r.cabine_virtual_photo_enabled === "boolean"
      ? { cabineVirtualPhotoEnabled: r.cabine_virtual_photo_enabled }
      : {}),
    ...(typeof r.cabine_virtual_boomerang_enabled === "boolean"
      ? { cabineVirtualBoomerangEnabled: r.cabine_virtual_boomerang_enabled }
      : {}),
    ...(typeof r.cabine_virtual_video_enabled === "boolean"
      ? { cabineVirtualVideoEnabled: r.cabine_virtual_video_enabled }
      : {}),
    ...(typeof r.cabine_virtual_video_max_duration_seconds === "number"
      ? {
          cabineVirtualVideoMaxDurationSeconds: clampVideoMaxDurationSeconds(
            r.cabine_virtual_video_max_duration_seconds,
          ),
        }
      : {}),
    ...(typeof r.cabine_virtual_camera_enabled === "boolean"
      ? { cabineVirtualCameraEnabled: r.cabine_virtual_camera_enabled }
      : {}),
    ...(typeof r.cabine_virtual_gallery_import_enabled === "boolean"
      ? {
          cabineVirtualGalleryImportEnabled:
            r.cabine_virtual_gallery_import_enabled,
        }
      : {}),
    ...(typeof r.live_moments_enabled === "boolean"
      ? { liveMomentsEnabled: r.live_moments_enabled }
      : {}),
    ...(typeof r.allow_likes === "boolean" ? { allowLikes: r.allow_likes } : {}),
    ...(typeof r.allow_media_share === "boolean"
      ? { allowMediaShare: r.allow_media_share }
      : {}),
    ...(typeof r.view_count === "number"
      ? { viewCount: Math.max(0, Math.trunc(r.view_count)) }
      : {}),
    ...(typeof r.download_count === "number"
      ? { downloadCount: Math.max(0, Math.trunc(r.download_count)) }
      : {}),
    ...(typeof r.share_count === "number"
      ? { shareCount: Math.max(0, Math.trunc(r.share_count)) }
      : {}),
    ...(deletePinHash ? { deletePinHash } : {}),
    ...(r.owner_user_id ? { ownerUserId: String(r.owner_user_id) } : {}),
  };
}

/**
 * Domínio → banco.
 * Booleans NOT NULL são sempre literais `true`/`false` (nunca omitidos no JSON).
 */
export function eventToRow(e: GalleryEventRecord): EventRow {
  return {
    id: e.id,
    slug: e.slug,
    name: e.name,
    upload_token: e.uploadToken,
    created_at: e.createdAt,
    cover_image: e.coverImage ?? "",
    videos_count: e.videosCount ?? 0,
    owner_user_id: e.ownerUserId?.trim() ? e.ownerUserId.trim() : null,
    allow_public_delete: booleanToDb(e.allowPublicDelete),
    require_delete_pin: booleanToDb(e.requireDeletePin),
    delete_pin_hash: e.deletePinHash?.trim() ? e.deletePinHash.trim() : null,
    allow_guest_upload: booleanToDb(e.allowGuestUpload),
    require_guest_upload_approval: booleanToDb(e.requireGuestUploadApproval),
    frame_url: e.frameUrl ?? "",
    gallery_layout: normalizeGalleryLayout(e.galleryLayout),
    cabine_virtual_enabled: e.cabineVirtualEnabled === true,
    cabine_virtual_photo_enabled: e.cabineVirtualPhotoEnabled === true,
    cabine_virtual_boomerang_enabled: e.cabineVirtualBoomerangEnabled === true,
    cabine_virtual_video_enabled: e.cabineVirtualVideoEnabled === true,
    cabine_virtual_video_max_duration_seconds: clampVideoMaxDurationSeconds(
      e.cabineVirtualVideoMaxDurationSeconds,
    ),
    cabine_virtual_camera_enabled: e.cabineVirtualCameraEnabled !== false,
    cabine_virtual_gallery_import_enabled:
      e.cabineVirtualGalleryImportEnabled !== false,
    live_moments_enabled: e.liveMomentsEnabled === true,
    allow_likes: e.allowLikes === true,
    allow_media_share: e.allowMediaShare !== false,
    view_count: Math.max(0, Math.trunc(e.viewCount ?? 0)),
    download_count: Math.max(0, Math.trunc(e.downloadCount ?? 0)),
    share_count: Math.max(0, Math.trunc(e.shareCount ?? 0)),
  };
}

/** Gate usado pelo guest-upload/sign (regra inalterada). */
export function isGuestUploadAllowed(
  event: Pick<GalleryEventRecord, "allowGuestUpload"> | undefined | null,
): boolean {
  return event?.allowGuestUpload === true;
}
