import { revalidatePath } from "next/cache";
import {
  buildVirtualBoothFrameKey,
  storePublicAssetObject,
} from "@/lib/r2/upload";
import {
  isVirtualBoothFrameContentType,
  MAX_VIRTUAL_BOOTH_FRAME_BYTES,
} from "@/lib/virtual-booth/frame-validation";
import { getRouteHandlerUser } from "@/lib/auth/session";
import {
  assertUserCanMutateEvent,
  DashboardAccessError,
} from "@/lib/auth/dashboard-access";
import { deleteR2ObjectsByKeys, tryCreateR2DeletionClient } from "@/lib/r2/removal";
import {
  getEventById,
  updateEventVirtualBoothFrameUrl,
} from "@/services/eventService";

export const runtime = "nodejs";

async function authorizeEventMutation(eventId: string) {
  const userOrRes = await getRouteHandlerUser();

  if (userOrRes instanceof Response) {
    return userOrRes;
  }

  const event = await getEventById(eventId);

  try {
    assertUserCanMutateEvent(userOrRes.id, event);
  } catch (err) {
    if (err instanceof DashboardAccessError) {
      return Response.json({ error: err.message }, { status: err.status });
    }

    throw err;
  }

  if (!event) {
    return Response.json({ error: "Evento não encontrado." }, { status: 404 });
  }

  return event;
}

function revalidateEventPaths(slug: string, eventId: string) {
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/events/${encodeURIComponent(eventId)}`);
  revalidatePath(`/evento/${slug}`);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await context.params;
    const trimmedEventId = eventId?.trim();

    if (!trimmedEventId) {
      return Response.json({ error: "eventId inválido." }, { status: 400 });
    }

    const authResult = await authorizeEventMutation(trimmedEventId);

    if (authResult instanceof Response) {
      return authResult;
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "Envie um arquivo PNG." }, { status: 400 });
    }

    if (!isVirtualBoothFrameContentType(file.type)) {
      return Response.json(
        { error: "A moldura deve ser um PNG transparente." },
        { status: 415 },
      );
    }

    if (file.size <= 0 || file.size > MAX_VIRTUAL_BOOTH_FRAME_BYTES) {
      return Response.json(
        { error: "A moldura deve ter no máximo 5 MB." },
        { status: 413 },
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const frameUrl = await storePublicAssetObject({
      bytes,
      contentType: "image/png",
      key: buildVirtualBoothFrameKey(trimmedEventId),
    });

    const { event: updated } = await updateEventVirtualBoothFrameUrl(
      trimmedEventId,
      frameUrl,
    );

    revalidateEventPaths(updated.slug, updated.id);

    return Response.json({
      ok: true,
      frameUrl: updated.frameUrl,
    });
  } catch (error) {
    console.error("[VIRTUAL_BOOTH_FRAME_UPLOAD] erro", error);

    return Response.json(
      { error: "Não foi possível salvar a moldura." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await context.params;
    const trimmedEventId = eventId?.trim();

    if (!trimmedEventId) {
      return Response.json({ error: "eventId inválido." }, { status: 400 });
    }

    const authResult = await authorizeEventMutation(trimmedEventId);

    if (authResult instanceof Response) {
      return authResult;
    }

    const r2 = tryCreateR2DeletionClient();

    if (r2) {
      await deleteR2ObjectsByKeys(r2.client, r2.bucket, [
        buildVirtualBoothFrameKey(trimmedEventId),
      ]);
    }

    const { event: updated } = await updateEventVirtualBoothFrameUrl(
      trimmedEventId,
      "",
    );

    revalidateEventPaths(updated.slug, updated.id);

    return Response.json({ ok: true });
  } catch (error) {
    console.error("[VIRTUAL_BOOTH_FRAME_DELETE] erro", error);

    return Response.json(
      { error: "Não foi possível remover a moldura." },
      { status: 500 },
    );
  }
}
