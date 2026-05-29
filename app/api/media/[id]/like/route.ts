import { revalidatePath } from "next/cache";
import { togglePublicMediaLike } from "@/lib/public/public-media-like";

export const runtime = "nodejs";

type MediaLikeContext = {
  params: Promise<{ id: string }>;
};

function revalidateMediaPaths(media: {
  id: string;
  eventId: string;
  eventSlug: string;
}) {
  revalidatePath("/");
  revalidatePath(`/dashboard/events/${encodeURIComponent(media.eventId)}`);
  revalidatePath(`/evento/${media.eventSlug}`);
  revalidatePath(`/video/${encodeURIComponent(media.id)}`);
}

export async function POST(request: Request, context: MediaLikeContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { visitorKey?: unknown };
    const result = await togglePublicMediaLike(id, body.visitorKey);

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    revalidateMediaPaths({
      id: result.mediaId,
      eventId: result.eventId,
      eventSlug: result.eventSlug,
    });

    return Response.json({
      ok: true,
      liked: result.liked,
      likesCount: result.likesCount,
      mediaId: result.mediaId,
    });
  } catch (error) {
    console.error("[PUBLIC_MEDIA_LIKE] erro", error);

    return Response.json(
      { error: "Não foi possível atualizar a curtida." },
      { status: 500 },
    );
  }
}
