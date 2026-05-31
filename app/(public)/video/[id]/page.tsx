import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AmbientBackground } from "@/components/public/ambient-background";
import { EventGalleryEntryCta } from "@/components/public/event-gallery-entry-cta";
import { PublicMediaDeleteButton } from "@/components/public/public-media-delete-button";
import { QrCode } from "@/components/public/qr-code";
import { VideoPageActions } from "@/components/public/video-page-actions";
import { VideoPlayer } from "@/components/public/video-player";
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

  const downloadLabel =
    video.mediaType === "boomerang"
      ? "Baixar Boomerang"
      : video.mediaType === "gif"
        ? "Baixar GIF"
        : video.mediaType === "image"
          ? "Baixar imagem"
          : "Baixar vídeo";

  return (
    <main className="relative min-h-dvh overflow-hidden px-4 pb-10 pt-4 text-white sm:px-6 sm:pb-14 sm:pt-5">
      <AmbientBackground />

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="animate-rise flex items-center justify-end">
          <Link
            href={routes.home}
            className="inline-flex min-h-10 items-center rounded-full border border-white/10 bg-black/30 px-4 text-sm font-semibold text-white/65 backdrop-blur-xl transition hover:bg-white/10 hover:text-white"
          >
            Início
          </Link>
        </header>

        <div className="animate-rise flex flex-col gap-5 [animation-delay:60ms] sm:gap-6">
          <VideoPlayer video={video} autoPlay />

          <VideoPageActions
            video={video}
            downloadLabel={downloadLabel}
            downloadFileName={suggestedDownloadFileName(video)}
            allowLikes={allowLikes}
            allowMediaShare={allowMediaShare}
          />

          <div className="flex justify-center">
            <EventGalleryEntryCta eventHref={eventHref} />
          </div>

          {video.allowPublicDelete ? (
            <div className="flex justify-center pt-1">
              <PublicMediaDeleteButton
                mediaId={video.id}
                title={video.title}
                eventHref={eventHref}
                requireDeletePin={video.requireDeletePin}
              />
            </div>
          ) : null}
        </div>
      </div>

      <footer className="pointer-events-none fixed inset-x-0 bottom-0 z-30 hidden border-t border-white/10 bg-slate-950/85 px-6 py-4 backdrop-blur-2xl xl:pointer-events-auto xl:block">
        <div className="mx-auto flex max-w-[1800px] justify-end">
          <div className="pointer-events-auto">
            <QrCode
              label="Abrir na galeria"
              value={video.qrUrl}
              imagePath={video.qrCode}
              compact
            />
          </div>
        </div>
      </footer>
    </main>
  );
}
