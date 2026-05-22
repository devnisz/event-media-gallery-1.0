import { revalidatePath } from "next/cache";
import {
  deleteEventAndRelatedAssets,
  EventNotFoundDeletionError,
} from "@/services/eventDeletionService";
import { getRouteHandlerUser } from "@/lib/auth/session";
import {
  assertUserCanMutateEvent,
  DashboardAccessError,
} from "@/lib/auth/dashboard-access";
import {
  getEventById,
  updateEventGalleryDeleteSettings,
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

    try {
      assertUserCanMutateEvent(userOrRes.id, event);
    } catch (err) {
      if (err instanceof DashboardAccessError) {
        return Response.json({ error: err.message }, { status: err.status });
      }

      throw err;
    }

    const body = (await request.json()) as {
      allowPublicDelete?: unknown;
      requireDeletePin?: unknown;
      deletePin?: unknown;
      allowGuestUpload?: unknown;
    };

    if (
      typeof body.allowPublicDelete !== "boolean" ||
      typeof body.requireDeletePin !== "boolean"
    ) {
      return Response.json(
        { error: "Configurações inválidas." },
        { status: 400 },
      );
    }

    const updateResult = await updateEventGalleryDeleteSettings(trimmedEventId, {
      allowPublicDelete: body.allowPublicDelete,
      requireDeletePin: body.requireDeletePin,
      deletePin:
        typeof body.deletePin === "string" ? body.deletePin : undefined,
      allowGuestUpload:
        typeof body.allowGuestUpload === "boolean"
          ? body.allowGuestUpload
          : undefined,
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
        allowPublicDelete: updated.allowPublicDelete,
        requireDeletePin: updated.requireDeletePin,
        allowGuestUpload: updated.allowGuestUpload,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível salvar as configurações.";

    console.error("Erro ao atualizar configurações do evento:", error);

    return Response.json({ error: message }, { status: 500 });
  }
}

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
