import type { LiveMomentsSortOrder } from "@/lib/live-moments/config";
import type { EventMedia, MediaKind } from "@/types/media";

export const LIVE_MOMENTS_PHOTO_MS = 3000;
export const LIVE_MOMENTS_BOOMERANG_MS = 4500;

const LIVE_MOMENT_KINDS = new Set<MediaKind>(["image", "boomerang", "video"]);

export type LiveMomentKind = "image" | "boomerang" | "video";

export type LiveMomentItem = {
  id: string;
  kind: LiveMomentKind;
  url: string;
  thumbnailUrl?: string;
  fileType: string;
  sortAt: number;
  occurredAt?: string;
};

export function isLiveMomentsEligibleKind(
  mediaType: MediaKind,
): mediaType is LiveMomentKind {
  return LIVE_MOMENT_KINDS.has(mediaType);
}

export function buildLiveMomentsFromGalleryMedia(
  items: EventMedia[],
  sortOrder: LiveMomentsSortOrder,
): LiveMomentItem[] {
  const moments = items
    .filter((item) => isLiveMomentsEligibleKind(item.mediaType))
    .map((item) => toLiveMomentItem(item));

  moments.sort((a, b) => {
    const delta = a.sortAt - b.sortAt;

    return sortOrder === "newest-first" ? -delta : delta;
  });

  return moments;
}

function toLiveMomentItem(item: EventMedia): LiveMomentItem {
  const kind = item.mediaType as LiveMomentKind;

  return {
    id: item.id,
    kind,
    url: item.url || item.videoUrl,
    thumbnailUrl: item.thumbnailUrl ?? item.thumbnail,
    fileType: item.fileType,
    sortAt: item.sortAt ?? 0,
    occurredAt: item.uploadedAt,
  };
}

export function getLiveMomentLabel(kind: LiveMomentKind): string {
  switch (kind) {
    case "image":
      return "Foto";
    case "boomerang":
      return "Boomerang";
    case "video":
      return "Vídeo";
    default:
      return "Mídia";
  }
}

const LIVE_MOMENTS_PREVIEW_COUNT = 4;

export function pickLiveMomentPreviews(
  moments: LiveMomentItem[],
  count = LIVE_MOMENTS_PREVIEW_COUNT,
): LiveMomentItem[] {
  return moments.slice(0, Math.max(0, count));
}

/** URL para thumbnail do card (prioriza poster; vídeo sem thumb retorna null). */
export function resolveLiveMomentPreviewUrl(item: LiveMomentItem): string | null {
  const thumb = item.thumbnailUrl?.trim();

  if (thumb) {
    return thumb;
  }

  if (item.kind === "image" || item.kind === "boomerang") {
    const url = item.url?.trim();

    return url || null;
  }

  return null;
}

export function getLiveMomentIcon(kind: LiveMomentKind): string {
  switch (kind) {
    case "image":
      return "📸";
    case "boomerang":
      return "🔄";
    case "video":
      return "🎥";
    default:
      return "✨";
  }
}

export function formatLiveMomentTime(iso?: string): string | null {
  if (!iso?.trim()) {
    return null;
  }

  const timestamp = Date.parse(iso);

  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function getLiveMomentStaticDurationMs(kind: LiveMomentKind): number {
  if (kind === "image") {
    return LIVE_MOMENTS_PHOTO_MS;
  }

  if (kind === "boomerang") {
    return LIVE_MOMENTS_BOOMERANG_MS;
  }

  return 0;
}
