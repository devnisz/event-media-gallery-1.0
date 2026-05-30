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
  const isVideo = video.mediaType === "video";

  const downloadLabel =
    video.mediaType === "boomerang"
      ? "Baixar Boomerang"
      : video.mediaType === "gif"
        ? "Baixar GIF"
        : video.mediaType === "image"
          ? "Baixar imagem"
          : "Baixar vídeo";

  const bodyCopy = isVideo
    ? "No celular, o som pode iniciar silenciado — use os controles quando quiser ouvir."
    : "Movimento e detalhes preservados nesta captura do evento.";

  return (
    <main className="relative min-h-dvh overflow-hidden px-4 pb-8 pt-4 text-white sm:px-6 sm:pb-10 sm:pt-5 lg:px-10 lg:pb-28">
      <AmbientBackground />

      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-5 sm:gap-6">
        <header className="animate-rise flex items-center justify-end">
          <Link
            href={routes.home}
            className="inline-flex min-h-10 items-center rounded-full border border-white/10 bg-black/30 px-4 text-sm font-semibold text-white/65 backdrop-blur-xl transition hover:bg-white/10 hover:text-white"
          >
            Início
          </Link>
        </header>

        <section className="grid flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start xl:gap-8">
          <div className="animate-rise flex min-w-0 flex-col gap-4 [animation-delay:60ms] sm:gap-5">
            <VideoPlayer video={video} autoPlay />

            <EventGalleryEntryCta
              eventName={video.event}
              eventHref={eventHref}
            />

            <div className="flex justify-center lg:hidden">
              <VideoPageActions
                video={video}
                downloadLabel={downloadLabel}
                downloadFileName={suggestedDownloadFileName(video)}
                allowLikes={allowLikes}
                allowMediaShare={allowMediaShare}
              />
            </div>
          </div>

          <aside className="animate-rise min-w-0 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-2xl sm:p-6 [animation-delay:120ms] xl:sticky xl:top-6">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200/90">
              {video.event}
            </p>
            <h1 className="mt-3 break-words text-xl font-black tracking-tight text-white sm:text-2xl">
              {video.title}
            </h1>
            <p className="mt-4 text-sm leading-6 text-white/55">{bodyCopy}</p>

            <div className="mt-6 hidden lg:block">
              <VideoPageActions
                video={video}
                downloadLabel={downloadLabel}
                downloadFileName={suggestedDownloadFileName(video)}
                allowLikes={allowLikes}
                allowMediaShare={allowMediaShare}
              />
            </div>

            {video.allowPublicDelete ? (
              <div className="mt-6 border-t border-white/10 pt-6">
                <PublicMediaDeleteButton
                  mediaId={video.id}
                  title={video.title}
                  eventHref={eventHref}
                  requireDeletePin={video.requireDeletePin}
                />
              </div>
            ) : null}
          </aside>
        </section>
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
