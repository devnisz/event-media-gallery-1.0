import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AmbientBackground } from "@/components/public/ambient-background";
import { MediaViewerNavigator } from "@/components/public/media-viewer-navigator";
import { getPublicGalleryEventSettings } from "@/lib/gallery/public-event-settings";
import { routes } from "@/lib/routes";
import { safeDecodeURIComponentSegment } from "@/lib/utils/safe-decode-uri";
import { getEventBySlug } from "@/services/eventService";
import {
  getEventVideosForEventSlug,
  getVideoById,
} from "@/services/videoService";

export const dynamic = "force-dynamic";

type VideoPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({ params }: VideoPageProps) {
  const { id } = await params;
  const decodedId = safeDecodeURIComponentSegment(id);
  const video = await getVideoById(decodedId);
  const title =
    video?.title && String(video.title).trim()
      ? String(video.title).trim()
      : "Mídia";

  return {
    title,
  };
}

export default async function StandaloneVideoPage({ params }: VideoPageProps) {
  await connection();

  const { id } = await params;
  const decodedId = safeDecodeURIComponentSegment(id);
  const video = await getVideoById(decodedId);

  if (!video) {
    notFound();
  }

  const event = await getEventBySlug(video.eventSlug);

  if (!event) {
    notFound();
  }

  const gallerySettings = getPublicGalleryEventSettings(event);
  const eventVideos = await getEventVideosForEventSlug(
    video.eventSlug,
    event.id,
    gallerySettings,
  );

  const initialIndex = eventVideos.findIndex((item) => item.id === video.id);
  const navigatorItems = initialIndex >= 0 ? eventVideos : [video];
  const navigatorIndex = initialIndex >= 0 ? initialIndex : 0;
  const eventHref = routes.event(video.eventSlug);
  const allowLikes = video.allowLikes === true;
  const allowMediaShare = video.allowMediaShare !== false;

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden px-2 py-2 text-white sm:px-3 sm:py-3">
      <AmbientBackground />

      <div className="animate-rise flex min-h-0 w-full flex-1 flex-col">
        <MediaViewerNavigator
          items={navigatorItems}
          initialIndex={navigatorIndex}
          eventHref={eventHref}
          eventSlug={video.eventSlug}
          allowLikes={allowLikes}
          allowMediaShare={allowMediaShare}
        />
      </div>
    </main>
  );
}
