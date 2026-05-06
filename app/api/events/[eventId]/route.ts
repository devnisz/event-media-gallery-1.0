import { revalidatePath } from "next/cache";
import {
  deleteEventAndRelatedAssets,
  EventNotFoundDeletionError,
} from "@/services/eventDeletionService";
import { getRouteHandlerUser } from "@/lib/auth/session";
import { assertUserCanMutateEvent, DashboardAccessError } from "@/lib/auth/dashboard-access";
import { getEventById } from "@/services/eventService";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  try {
    const userOrRes = await getRouteHandlerUser();

    if (userOrRes instanceof Response) {
      return userOrRes;
    }

    const { eventId } = await context.params;

    if (!eventId?.trim()) {
      return Response.json({ error: "eventId inválido." }, { status: 400 });
    }

    const event = await getEventById(eventId.trim());

    try {
      assertUserCanMutateEvent(userOrRes.id, event);
    } catch (err) {
      if (err instanceof DashboardAccessError) {
        return Response.json({ error: err.message }, { status: err.status });
      }

      throw err;
    }

    const report = await deleteEventAndRelatedAssets(eventId.trim());

    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath(`/evento/${report.eventSlug}`);

    return Response.json({ ok: true, report });
  } catch (error) {
    if (error instanceof EventNotFoundDeletionError) {
      return Response.json({ error: error.message }, { status: 404 });
    }

    console.error("Erro ao excluir evento:", error);

    return Response.json(
      { error: "Não foi possível excluir o evento." },
      { status: 500 },
    );
  }
}
