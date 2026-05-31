import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AmbientBackground } from "@/components/public/ambient-background";
import { SharedMediaStandalone } from "@/components/public/shared-media-standalone";
import { suggestedDownloadFileName } from "@/lib/media/suggestedDownloadFileName";
import { routes } from "@/lib/routes";
import { safeDecodeURIComponentSegment } from "@/lib/utils/safe-decode-uri";
import { getVideoById } from "@/services/videoService";

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
  const video = await getVideoById(safeDecodeURIComponentSegment(id));

  if (!video) {
    notFound();
  }

  const eventHref = routes.event(video.eventSlug);
  const allowLikes = video.allowLikes === true;
  const allowMediaShare = video.allowMediaShare !== false;

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden px-4 py-3 text-white sm:px-5 sm:py-4">
      <AmbientBackground />

      <div className="animate-rise mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-start">
        <SharedMediaStandalone
          media={video}
          eventHref={eventHref}
          downloadLabel="Baixar"
          downloadFileName={suggestedDownloadFileName(video)}
          allowLikes={allowLikes}
          allowMediaShare={allowMediaShare}
        />
      </div>
    </main>
  );
}
