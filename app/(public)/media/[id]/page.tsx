import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AmbientBackground } from "@/components/public/ambient-background";
import { MediaOpenPerfAnchor } from "@/components/public/media-open-perf-anchor";
import { MediaViewerPageClient } from "@/components/public/media-viewer-page-client";
import { VideoPageClearOpenPreview } from "@/components/public/video-page-loading-shell";
import {
  createMediaOpenServerTimer,
  measureMediaOpenServer,
} from "@/lib/gallery/media-open-perf-server";
import { routes } from "@/lib/routes";
import { safeDecodeURIComponentSegment } from "@/lib/utils/safe-decode-uri";
import { getEventBySlug } from "@/services/eventService";
import { getVideoById } from "@/services/videoService";

export const dynamic = "force-dynamic";

type MediaPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({ params }: MediaPageProps) {
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

export default async function StandaloneMediaPage({ params }: MediaPageProps) {
  const pageTimer = createMediaOpenServerTimer();

  await measureMediaOpenServer("connection()", () => connection());

  const { id } = await params;
  const decodedId = safeDecodeURIComponentSegment(id);

  const video = await measureMediaOpenServer(
    "getVideoById",
    () => getVideoById(decodedId),
    { id: decodedId },
  );

  if (!video) {
    notFound();
  }

  const event = await measureMediaOpenServer(
    "getEventBySlug",
    () => getEventBySlug(video.eventSlug),
    { slug: video.eventSlug },
  );

  if (!event) {
    notFound();
  }

  const eventHref = routes.event(video.eventSlug);
  const allowLikes = video.allowLikes === true;
  const allowMediaShare = video.allowMediaShare !== false;

  pageTimer.finish({
    mediaId: video.id,
    deferredCarouselList: true,
  });

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden px-2 py-2 text-white sm:px-3 sm:py-3">
      <VideoPageClearOpenPreview />
      <MediaOpenPerfAnchor />
      <AmbientBackground />

      <div className="flex min-h-0 w-full flex-1 flex-col">
        <MediaViewerPageClient
          video={video}
          eventHref={eventHref}
          eventSlug={video.eventSlug}
          allowLikes={allowLikes}
          allowMediaShare={allowMediaShare}
        />
      </div>
    </main>
  );
}
