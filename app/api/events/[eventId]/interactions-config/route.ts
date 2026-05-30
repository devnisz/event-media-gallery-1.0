import { revalidatePath } from "next/cache";
import { getRouteHandlerUser } from "@/lib/auth/session";
import {
  assertUserCanMutateEvent,
  DashboardAccessError,
} from "@/lib/auth/dashboard-access";
import {
  getEventById,
  updateEventInteractionsSettings,
} from "@/services/eventService";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  try {
    const userOrRes = await getRouteHandlerUser();

    if (userOrRes instanceof Response) {
      return userOrRes;
    }

    const { eventId } = await context.params;
    const trimmedEventId = eventId?.trim();

    if (!trimmedEventId) {
      return Response.json({ error: "eventId inválido." }, { status: 400 });
    }

    const event = await getEventById(trimmedEventId);

    if (!event) {
      return Response.json({ error: "Evento não encontrado." }, { status: 404 });
    }

    try {
      assertUserCanMutateEvent(userOrRes.id, event);
    } catch (err) {
      if (err instanceof DashboardAccessError) {
        return Response.json({ error: err.message }, { status: err.status });
      }

      throw err;
    }

    const body = (await request.json()) as {
      allowLikes?: unknown;
      allowMediaShare?: unknown;
    };

    if (typeof body.allowLikes !== "boolean") {
      return Response.json(
        { error: "Configuração de curtidas inválida." },
        { status: 400 },
      );
    }

    if (typeof body.allowMediaShare !== "boolean") {
      return Response.json(
        { error: "Configuração de compartilhamento inválida." },
        { status: 400 },
      );
    }

    const updateResult = await updateEventInteractionsSettings(trimmedEventId, {
      allowLikes: body.allowLikes,
      allowMediaShare: body.allowMediaShare,
    }).catch((err: unknown) => {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível salvar as configurações.";

      return Response.json({ error: message }, { status: 400 });
    });

    if (updateResult instanceof Response) {
      return updateResult;
    }

    const { event: updated } = updateResult;

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/events/${encodeURIComponent(updated.id)}`);
    revalidatePath(`/evento/${updated.slug}`);

    return Response.json({
      ok: true,
      event: {
        id: updated.id,
        allowLikes: updated.allowLikes,
        allowMediaShare: updated.allowMediaShare,
      },
    });
  } catch (error) {
    console.error("[INTERACTIONS_CONFIG] erro", error);

    return Response.json(
      { error: "Não foi possível salvar as configurações." },
      { status: 500 },
    );
  }
}
