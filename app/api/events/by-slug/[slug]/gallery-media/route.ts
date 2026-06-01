import { getPublicGalleryEventSettings } from "@/lib/gallery/public-event-settings";
import { getEventBySlug } from "@/services/eventService";
import { getEventVideosForEventSlug } from "@/services/videoService";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const eventSlug = slug?.trim();

  if (!eventSlug) {
    return Response.json({ error: "Slug inválido." }, { status: 400 });
  }

  const event = await getEventBySlug(eventSlug);

  if (!event) {
    return Response.json({ error: "Evento não encontrado." }, { status: 404 });
  }

  const gallerySettings = getPublicGalleryEventSettings(event);
  const items = await getEventVideosForEventSlug(
    eventSlug,
    event.id,
    gallerySettings,
  );

  return Response.json({ items });
}
