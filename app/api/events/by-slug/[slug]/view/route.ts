import { revalidatePath } from "next/cache";

import { recordEventGalleryView } from "@/lib/public/record-engagement";

export const runtime = "nodejs";

type EventViewContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: Request, context: EventViewContext) {
  try {
    const { slug } = await context.params;
    const body = (await request.json()) as { visitorKey?: unknown };
    const result = await recordEventGalleryView(slug, body.visitorKey);

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    if (result.counted && result.eventId) {
      revalidatePath(`/dashboard/events/${encodeURIComponent(result.eventId)}`);
    }

    revalidatePath(`/evento/${slug}`);

    return Response.json({
      ok: true,
      counted: result.counted,
    });
  } catch (error) {
    console.error("[EVENT_GALLERY_VIEW] erro", error);

    return Response.json(
      { error: "Não foi possível registrar a visualização." },
      { status: 500 },
    );
  }
}
