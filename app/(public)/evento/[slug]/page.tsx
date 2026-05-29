import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AmbientBackground } from "@/components/public/ambient-background";
import { VideoGallery } from "@/components/public/video-gallery";
import { resolveLikesConfig } from "@/lib/likes/config";
import { resolveLiveMomentsConfig } from "@/lib/live-moments/config";
import { resolveCabineVirtualConfig } from "@/lib/virtual-booth/event-config";
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
    title: event ? `${event.name} — Galeria ao vivo` : "Evento",
  };
}

export default async function EventGalleryPage({ params }: EventPageProps) {
  await connection();

  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) {
    notFound();
  }

  const cabineConfig = resolveCabineVirtualConfig(event);
  const liveMomentsConfig = resolveLiveMomentsConfig(event);
  const likesConfig = resolveLikesConfig(event);

  const eventVideos = await getEventVideosForEventSlug(slug, event.id, {
    allowPublicDelete: event.allowPublicDelete,
    requireDeletePin: event.allowPublicDelete && event.requireDeletePin,
  });

  return (
    <main className="relative min-h-dvh overflow-hidden text-white">
      <AmbientBackground />

      <VideoGallery
        key={event.slug}
        initialVideos={eventVideos}
        eventSlug={event.slug}
        eventName={event.name}
        eventId={event.id}
        allowPublicDelete={event.allowPublicDelete}
        requireDeletePin={event.allowPublicDelete && event.requireDeletePin}
        allowGuestUpload={event.allowGuestUpload}
        frameUrl={event.frameUrl}
        galleryLayout={event.galleryLayout}
        cabineConfig={cabineConfig}
        liveMomentsEnabled={liveMomentsConfig.enabled}
        allowLikes={likesConfig.enabled}
      />
    </main>
  );
}
