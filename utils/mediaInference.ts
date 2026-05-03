import type { MediaKind } from "@/types/media";

const VIDEO_EXT = /\.(mp4|webm|mov|m4v|mkv|avi)(\?|#|$)/i;
const GIF_EXT = /\.gif(\?|#|$)/i;
const IMAGE_EXT = /\.(jpe?g|png|webp|avif)(\?|#|$)/i;

function normalizeExplicitMediaType(
  raw: string | undefined,
): MediaKind | undefined {
  const v = raw?.trim().toLowerCase();

  if (v === "video" || v === "image" || v === "gif") {
    return v;
  }

  return undefined;
}

/** Deduz tipo lógico da mídia (único modelo para vídeo / foto / GIF animado). */
export function inferMediaKind(
  explicitMediaType: string | undefined,
  explicitMime: string | undefined,
  assetUrl: string,
): MediaKind {
  const fromField = normalizeExplicitMediaType(explicitMediaType);

  if (fromField) {
    return fromField;
  }

  const mime = explicitMime?.trim().toLowerCase() ?? "";

  if (mime === "image/gif") {
    return "gif";
  }

  if (mime.startsWith("video/")) {
    return "video";
  }

  if (mime.startsWith("image/")) {
    return "image";
  }

  const pathOnly = assetUrl.split(/[?#]/)[0]?.toLowerCase() ?? "";

  if (GIF_EXT.test(pathOnly)) {
    return "gif";
  }

  if (VIDEO_EXT.test(pathOnly)) {
    return "video";
  }

  if (IMAGE_EXT.test(pathOnly)) {
    return "image";
  }

  return "video";
}

/** MIME coerente com `mediaKind` e URL quando o JSON não traz `fileType`. */
export function inferFileType(
  mediaKind: MediaKind,
  explicitMime: string | undefined,
  assetUrl: string,
): string {
  const trimmed = explicitMime?.trim();

  if (trimmed) {
    return trimmed;
  }

  const pathOnly = assetUrl.split(/[?#]/)[0]?.toLowerCase() ?? "";

  if (mediaKind === "gif") {
    return "image/gif";
  }

  if (mediaKind === "video") {
    if (pathOnly.endsWith(".webm")) {
      return "video/webm";
    }

    if (pathOnly.endsWith(".mov")) {
      return "video/quicktime";
    }

    return "video/mp4";
  }

  if (pathOnly.endsWith(".png")) {
    return "image/png";
  }

  if (pathOnly.endsWith(".webp")) {
    return "image/webp";
  }

  if (pathOnly.endsWith(".jpeg") || pathOnly.endsWith(".jpg")) {
    return "image/jpeg";
  }

  return "image/jpeg";
}
