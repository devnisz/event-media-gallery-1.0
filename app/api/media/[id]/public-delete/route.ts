import { revalidatePath } from "next/cache";
import { softDeletePublicMedia } from "@/lib/public/public-media-actions";

type PublicMediaDeleteContext = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";

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

async function readPin(request: Request): Promise<string | undefined> {
  try {
    const body = (await request.json()) as { pin?: unknown };

    return typeof body.pin === "string" ? body.pin : undefined;
  } catch {
    return undefined;
  }
}

export async function DELETE(
  request: Request,
  context: PublicMediaDeleteContext,
) {
  try {
    const { id } = await context.params;
    const result = await softDeletePublicMedia(id, await readPin(request));

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    revalidateMediaPaths(result.media);

    return Response.json({ ok: true, deletedMedia: result.media });
  } catch (error) {
    console.error("[PUBLIC_MEDIA_DELETE] erro", error);

    return Response.json(
      { error: "Não foi possível excluir a mídia." },
      { status: 500 },
    );
  }
}
