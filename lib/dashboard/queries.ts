import { notFound } from "next/navigation";
import type { GalleryEventRecord } from "@/types/event";
import type { GalleryMediaRecord } from "@/types/media";
import { assertUserCanMutateEvent } from "@/lib/auth/dashboard-access";
import { buildPublicPageUrl } from "@/lib/media/publicPageUrl";
import { routes } from "@/lib/routes";
import { getEventById, readDashboardEvents } from "@/services/eventService";
import { getDashboardMediaForEvent } from "@/services/mediaService";

export type DashboardEventSummary = GalleryEventRecord & {
  mediaCount: number;
  lastUpdatedAt: string;
  displayCover: string | null;
  favoriteCount: number;
  hiddenCount: number;
};

export type DashboardEventDetail = {
  event: GalleryEventRecord;
  publicPath: string;
  publicUrl: string;
  media: GalleryMediaRecord[];
  recentUploads: GalleryMediaRecord[];
  pendingGuestUploads: GalleryMediaRecord[];
  mediaCount: number;
  favoriteCount: number;
  hiddenCount: number;
  lastUpdatedAt: string;
  displayCover: string | null;
};

function mediaDate(media: GalleryMediaRecord): string | undefined {
  return media.uploadedAt ?? media.createdAt ?? media.timestamp;
}

function newestDate(...values: Array<string | undefined>): string {
  const newest = values
    .filter((value): value is string => Boolean(value?.trim()))
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0];

  return newest ?? new Date(0).toISOString();
}

function coverForEvent(
  event: GalleryEventRecord,
  media: GalleryMediaRecord[],
): string | null {
  const explicit = event.coverImage.trim();

  if (explicit) {
    return explicit;
  }

  const favorite = media.find((item) => item.isFavorite && item.thumbnailUrl);
  const withThumbnail = media.find((item) => item.thumbnailUrl);
  const image = media.find((item) => item.mediaType !== "video" && item.url);

  return favorite?.thumbnailUrl ?? withThumbnail?.thumbnailUrl ?? image?.url ?? null;
}

async function summarizeEvent(
  event: GalleryEventRecord,
): Promise<DashboardEventSummary> {
  const media = await getDashboardMediaForEvent(event.id);

  return {
    ...event,
    mediaCount: media.length,
    favoriteCount: media.filter((item) => item.isFavorite).length,
    hiddenCount: media.filter((item) => item.isHidden).length,
    lastUpdatedAt: newestDate(event.createdAt, ...media.map(mediaDate)),
    displayCover: coverForEvent(event, media),
  };
}

export async function getDashboardEventSummaries(
  userId: string,
): Promise<DashboardEventSummary[]> {
  const events = await readDashboardEvents(userId);
  const summaries = await Promise.all(events.map(summarizeEvent));

  return summaries.sort(
    (a, b) => Date.parse(b.lastUpdatedAt) - Date.parse(a.lastUpdatedAt),
  );
}

export async function getDashboardEventDetail(
  userId: string,
  eventId: string,
): Promise<DashboardEventDetail> {
  const event = await getEventById(eventId);

  try {
    assertUserCanMutateEvent(userId, event);
  } catch {
    notFound();
  }

  const media = await getDashboardMediaForEvent(event.id);
  const sortedMedia = [...media].sort((a, b) => {
    const favoriteDelta = Number(Boolean(b.isFavorite)) - Number(Boolean(a.isFavorite));

    if (favoriteDelta !== 0) {
      return favoriteDelta;
    }

    return Date.parse(mediaDate(b) ?? "") - Date.parse(mediaDate(a) ?? "");
  });
  const publicPath = routes.event(event.slug);

  return {
    event,
    publicPath,
    publicUrl: buildPublicPageUrl(publicPath),
    media: sortedMedia,
    recentUploads: sortedMedia.slice(0, 6),
    pendingGuestUploads: sortedMedia.filter(
      (item) => item.mediaSource === "guest" && item.reviewStatus === "pending",
    ),
    mediaCount: sortedMedia.length,
    favoriteCount: sortedMedia.filter((item) => item.isFavorite).length,
    hiddenCount: sortedMedia.filter((item) => item.isHidden).length,
    lastUpdatedAt: newestDate(event.createdAt, ...sortedMedia.map(mediaDate)),
    displayCover: coverForEvent(event, sortedMedia),
  };
}
