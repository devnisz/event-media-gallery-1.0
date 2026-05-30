import { buildPublicPageUrl } from "@/lib/media/publicPageUrl";
import { routes } from "@/lib/routes";

export const EVENT_QR_PRINT_PX = 1000;

export function buildEventPublicUrl(slug: string): string {
  return buildPublicPageUrl(routes.event(slug));
}

export function shortenPublicUrl(url: string): string {
  const trimmed = url.trim();

  if (!trimmed) {
    return "";
  }

  try {
    const parsed = new URL(
      trimmed.startsWith("http") ? trimmed : `https://${trimmed}`,
    );

    return `${parsed.host}${parsed.pathname}`;
  } catch {
    if (trimmed.length <= 52) {
      return trimmed;
    }

    return `${trimmed.slice(0, 49)}…`;
  }
}
