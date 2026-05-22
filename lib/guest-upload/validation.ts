import type { MediaKind } from "@/types/media";

export const MAX_GUEST_UPLOAD_BYTES = 100 * 1024 * 1024;
export const MAX_THUMBNAIL_BYTES = 3 * 1024 * 1024;

export const ALLOWED_GUEST_UPLOAD_TYPES: Record<
  string,
  { extension: string; mediaType: MediaKind }
> = {
  "image/jpeg": { extension: "jpg", mediaType: "image" },
  "image/png": { extension: "png", mediaType: "image" },
  "image/webp": { extension: "webp", mediaType: "image" },
  "image/gif": { extension: "gif", mediaType: "gif" },
  "video/mp4": { extension: "mp4", mediaType: "video" },
  "video/webm": { extension: "webm", mediaType: "video" },
  "video/quicktime": { extension: "mov", mediaType: "video" },
};

export const ALLOWED_GUEST_THUMBNAIL_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function cleanGuestUploadName(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 120);
}
