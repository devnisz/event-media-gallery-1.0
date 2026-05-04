import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AmbientBackground } from "@/components/public/ambient-background";
import { VideoGallery } from "@/components/public/video-gallery";
import { routes } from "@/lib/routes";
import { getEventBySlug } from "@/services/eventService";
import { getEventVideosForEventSlug } from "@/services/videoService";

export const dynamic = "force-dynamic";

type EventPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: EventPageProps) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  return {
    title: event ? event.name : "Evento",
  };
}

export default async function EventGalleryPage({ params }: EventPageProps) {
  await connection();

  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) {
    notFound();
  }

  const eventVideos = await getEventVideosForEventSlug(slug, event.id);

  return (
    <main className="relative min-h-dvh overflow-hidden px-5 py-8 text-white sm:px-8 lg:px-12 2xl:px-20">
      <AmbientBackground />

      <section className="mx-auto flex w-full max-w-[1900px] flex-col gap-10">
        <header className="animate-rise flex flex-col gap-6 rounded-[2.5rem] border border-white/10 bg-white/[0.06] p-7 shadow-[0_28px_90px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
            <Link
              href={routes.home}
              className="inline-flex min-h-14 items-center rounded-full border border-white/12 bg-black/35 px-7 text-base font-semibold text-white backdrop-blur-xl transition hover:bg-white/12 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/35 active:scale-[0.98]"
            >
              ← Voltar aos eventos
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-200">
                Explore a galeria do evento
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
                {event.name}
              </h1>
              <p className="mt-3 max-w-3xl text-lg text-white/62">
                Experiência interativa com vídeos, fotos e compartilhamento
                instantâneo. Vídeos, fotos e GIFs capturados durante o evento.
              </p>
            </div>
          </div>
        </header>

        <VideoGallery initialVideos={eventVideos} />
      </section>
    </main>
  );
}
