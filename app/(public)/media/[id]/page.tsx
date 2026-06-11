import { connection } from "next/server";
import { AmbientBackground } from "@/components/public/ambient-background";
import { MediaOpenPerfAnchor } from "@/components/public/media-open-perf-anchor";
import { MediaWaitingPageClient } from "@/components/public/media-waiting-page-client";
import { MediaViewerPageClient } from "@/components/public/media-viewer-page-client";
import { VideoPageClearOpenPreview } from "@/components/public/video-page-loading-shell";
import {
  createMediaOpenServerTimer,
  measureMediaOpenServer,
} from "@/lib/gallery/media-open-perf-server";
import { resolveMediaPageRenderMode } from "@/lib/media/resolve-media-page";
import { routes } from "@/lib/routes";
import { safeDecodeURIComponentSegment } from "@/lib/utils/safe-decode-uri";
export const dynamic = "force-dynamic";

type MediaPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({ params }: MediaPageProps) {
  const { id } = await params;
  const decodedId = safeDecodeURIComponentSegment(id);
  const mode = await resolveMediaPageRenderMode(decodedId);

  if (mode.mode === "viewer") {
    const title =
      mode.video.title && String(mode.video.title).trim()
        ? String(mode.video.title).trim()
        : "Mídia";

    return { title };
  }

  return { title: "Preparando sua mídia" };
}

function MediaWaitingPage({
  mediaId,
  initialStatus,
}: {
  mediaId: string;
  initialStatus: Parameters<typeof MediaWaitingPageClient>[0]["initialStatus"];
}) {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden px-2 py-2 text-white sm:px-3 sm:py-3">
      <AmbientBackground />
      <div className="flex min-h-0 w-full flex-1 flex-col">
        <MediaWaitingPageClient
          mediaId={mediaId}
          initialStatus={initialStatus}
        />
      </div>
    </main>
  );
}

export default async function StandaloneMediaPage({ params }: MediaPageProps) {
  const pageTimer = createMediaOpenServerTimer();

  await measureMediaOpenServer("connection()", () => connection());

  const { id } = await params;
  const decodedId = safeDecodeURIComponentSegment(id);

  const mode = await measureMediaOpenServer(
    "resolveMediaPageRenderMode",
    () => resolveMediaPageRenderMode(decodedId),
    { id: decodedId },
  );

  if (mode.mode === "waiting") {
    return (
      <MediaWaitingPage
        mediaId={decodedId}
        initialStatus={mode.initialStatus}
      />
    );
  }

  const video = mode.video;
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
