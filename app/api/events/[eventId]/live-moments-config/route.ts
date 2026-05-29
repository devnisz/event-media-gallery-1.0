import { revalidatePath } from "next/cache";
import { getRouteHandlerUser } from "@/lib/auth/session";
import {
  assertUserCanMutateEvent,
  DashboardAccessError,
} from "@/lib/auth/dashboard-access";
import {
  getEventById,
  updateEventLiveMomentsSettings,
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

    const body = (await request.json()) as { liveMomentsEnabled?: unknown };

    if (typeof body.liveMomentsEnabled !== "boolean") {
      return Response.json(
        { error: "Configuração inválida." },
        { status: 400 },
      );
    }

    const { event: updated } = await updateEventLiveMomentsSettings(
      trimmedEventId,
      body.liveMomentsEnabled,
    );

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/events/${encodeURIComponent(updated.id)}`);
    revalidatePath(`/evento/${updated.slug}`);

    return Response.json({
      ok: true,
      event: {
        id: updated.id,
        liveMomentsEnabled: updated.liveMomentsEnabled,
      },
    });
  } catch (error) {
    console.error("[LIVE_MOMENTS_CONFIG] erro", error);

    return Response.json(
      { error: "Não foi possível salvar as configurações." },
      { status: 500 },
    );
  }
}
