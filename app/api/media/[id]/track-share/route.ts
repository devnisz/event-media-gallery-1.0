import { revalidatePath } from "next/cache";

import { recordMediaShare } from "@/lib/public/record-engagement";
import { safeDecodeURIComponentSegment } from "@/lib/utils/safe-decode-uri";

export const runtime = "nodejs";

type TrackShareContext = {
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

  revalidatePath(`/video/${encodeURIComponent(media.id)}`);
}

export async function POST(_request: Request, context: TrackShareContext) {
  try {
    const { id: rawParam } = await context.params;
    const id = safeDecodeURIComponentSegment(rawParam ?? "");
    const result = await recordMediaShare(id);

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    revalidateMediaPaths({
      id,
      eventId: result.eventId,
      eventSlug: result.eventSlug,
    });

    return Response.json({ ok: true, counted: result.counted });
  } catch (error) {
    console.error("[MEDIA_TRACK_SHARE] erro", error);

    return Response.json(
      { error: "Não foi possível registrar o compartilhamento." },
      { status: 500 },
    );
  }
}
