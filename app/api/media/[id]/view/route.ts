import { revalidatePath } from "next/cache";
import { revalidateMediaPublicPages } from "@/lib/routes";

import { recordMediaView } from "@/lib/public/record-engagement";
import { safeDecodeURIComponentSegment } from "@/lib/utils/safe-decode-uri";

export const runtime = "nodejs";

type MediaViewContext = {
  params: Promise<{ id: string }>;
};

function revalidateMediaPaths(media: {
  id: string;
  eventId?: string;
  eventSlug?: string;
}) {
  if (media.eventId) {
    revalidatePath(`/dashboard/events/${encodeURIComponent(media.eventId)}`);
  }

  if (media.eventSlug) {
    revalidatePath(`/evento/${media.eventSlug}`);
  }

  revalidateMediaPublicPages(revalidatePath, media.id);
}

export async function POST(request: Request, context: MediaViewContext) {
  try {
    const { id: rawParam } = await context.params;
    const id = safeDecodeURIComponentSegment(rawParam ?? "");
    const body = (await request.json()) as { visitorKey?: unknown };
    const result = await recordMediaView(id, body.visitorKey);

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    revalidateMediaPaths({
      id,
      eventId: result.eventId,
      eventSlug: result.eventSlug,
    });

    return Response.json({
      ok: true,
      counted: result.counted,
    });
  } catch (error) {
    console.error("[MEDIA_VIEW] erro", error);

    return Response.json(
      { error: "Não foi possível registrar a visualização." },
      { status: 500 },
    );
  }
}
