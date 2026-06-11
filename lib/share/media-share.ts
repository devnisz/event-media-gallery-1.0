import { buildPublicPageUrl } from "@/lib/media/publicPageUrl";
import { routes } from "@/lib/routes";
import type { MediaKind } from "@/types/media";

export const MEDIA_SHARE_TITLE = "Confira esta mídia do evento";

function mediaKindShareLabel(mediaType: MediaKind): string {
  switch (mediaType) {
    case "video":
      return "vídeo";
    case "boomerang":
      return "boomerang";
    case "gif":
      return "GIF";
    case "image":
    default:
      return "foto";
  }
}

export function buildMediaShareUrl(mediaId: string): string {
  return buildPublicPageUrl(routes.media(mediaId));
}

export function buildMediaShareText(mediaType: MediaKind): string {
  return `Veja esta ${mediaKindShareLabel(mediaType)} compartilhada através do MidiaUp.`;
}

export function buildMediaSharePayload(mediaId: string, mediaType: MediaKind) {
  const url = buildMediaShareUrl(mediaId);

  return {
    url,
    title: MEDIA_SHARE_TITLE,
    text: buildMediaShareText(mediaType),
  };
}

export type ShareMediaOutcome = "shared" | "copied" | "cancelled" | "failed";

export async function shareMediaLink(payload: {
  url: string;
  title: string;
  text: string;
}): Promise<ShareMediaOutcome> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
      });

      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return "cancelled";
      }
    }
  }

  try {
    await navigator.clipboard.writeText(payload.url);

    return "copied";
  } catch {
    return "failed";
  }
}
