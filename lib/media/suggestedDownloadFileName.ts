import type { EventMedia } from "@/types/media";

/** Nome sugerido para `Content-Disposition` e `<a download>`. */
export function suggestedDownloadFileName(
  media: Pick<EventMedia, "title" | "mediaType" | "fileType">,
): string {
  const base =
    media.title
      .replace(/[/\\?%*:|"<>]/g, "-")
      .replace(/\s+/g, " ")
      .trim() || "midia";

  if (media.mediaType === "gif") {
    return `${base}.gif`;
  }

  if (media.mediaType === "image") {
    const ft = String(media.fileType ?? "").toLowerCase();

    if (ft.includes("png")) {
      return `${base}.png`;
    }

    if (ft.includes("webp")) {
      return `${base}.webp`;
    }

    return `${base}.jpg`;
  }

  return `${base}.mp4`;
}
