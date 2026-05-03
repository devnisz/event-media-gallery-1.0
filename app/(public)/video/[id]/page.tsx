import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AmbientBackground } from "@/components/public/ambient-background";
import { DownloadButton } from "@/components/public/download-button";
import { QrCode } from "@/components/public/qr-code";
import { VideoPlayer } from "@/components/public/video-player";
import { routes } from "@/lib/routes";
import { getVideoById } from "@/services/videoService";

export const dynamic = "force-dynamic";

type VideoPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({ params }: VideoPageProps) {
  const { id } = await params;
  const video = await getVideoById(decodeURIComponent(id));

  return {
    title: video ? video.title : "Mídia",
  };
}

export default async function StandaloneVideoPage({ params }: VideoPageProps) {
  await connection();

  const { id } = await params;
  const video = await getVideoById(decodeURIComponent(id));

  if (!video) {
    notFound();
  }

  const eventHref = routes.event(video.eventSlug);
  const isVideo = video.mediaType === "video";

  const downloadLabel =
    video.mediaType === "gif"
      ? "Baixar GIF"
      : video.mediaType === "image"
        ? "Baixar imagem"
        : "Baixar vídeo";

  const bodyCopy = isVideo
    ? "No celular, o som pode iniciar silenciado para uma reprodução suave — use os controles quando quiser ouvir."
    : "Imersão em tela ampla, com carregamento cuidadoso. Em GIFs, o movimento da captura é preservado.";

  return (
    <main className="relative min-h-dvh overflow-hidden px-5 pb-44 pt-6 text-white sm:px-8 lg:px-12">
      <AmbientBackground />

      <div className="mx-auto flex min-h-[calc(100dvh-14rem)] w-full max-w-[1800px] flex-col gap-6">
        <header className="animate-rise flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href={eventHref}
              className="inline-flex min-h-14 items-center rounded-full border border-white/10 bg-white/10 px-6 text-base font-semibold text-white backdrop-blur-2xl transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/40 active:scale-95"
            >
              Voltar ao evento
            </Link>
            <Link
              href={routes.home}
              className="inline-flex min-h-14 items-center rounded-full border border-white/10 bg-black/35 px-6 text-base font-semibold text-white/78 backdrop-blur-2xl transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/35 active:scale-95"
            >
              Home
            </Link>
          </div>
          <div className="hidden rounded-full border border-white/10 bg-black/35 px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-white/55 backdrop-blur-2xl sm:block">
            Compartilhar com elegância
          </div>
        </header>

        <section className="grid flex-1 items-center gap-8 xl:grid-cols-[1fr_24rem]">
          <div className="animate-rise [animation-delay:80ms]">
            <VideoPlayer video={video} autoPlay />
          </div>

          <aside className="animate-rise rounded-[2rem] border border-white/10 bg-white/[0.06] p-7 backdrop-blur-2xl [animation-delay:140ms]">
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-amber-200">
              {video.event}
            </p>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white xl:text-5xl">
              {video.title}
            </h1>
            <p className="mt-5 text-lg leading-8 text-white/60">{bodyCopy}</p>
            <div className="mt-8 flex flex-col gap-4">
              <DownloadButton href={video.downloadUrl} label={downloadLabel} />
              <Link
                href={eventHref}
                className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/15 px-8 text-base font-semibold text-white/82 transition hover:bg-white/10 active:scale-[0.98]"
              >
                Ver todas as mídias do evento
              </Link>
            </div>
          </aside>
        </section>
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-slate-950/72 px-5 py-4 backdrop-blur-2xl sm:px-8">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-5">
          <div className="hidden md:block">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/45">
              Convite especial
            </p>
            <p className="mt-1 text-xl font-semibold text-white">
              Quem escaneia revive o momento dentro da experiência completa da
              galeria.
            </p>
          </div>
          <QrCode
            label="Abrir na galeria"
            value={video.qrUrl}
            imagePath={video.qrCode}
          />
        </div>
      </footer>
    </main>
  );
}
