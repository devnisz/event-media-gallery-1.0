import { revalidatePath } from "next/cache";
import { getRouteHandlerUser } from "@/lib/auth/session";
import {
  assertUserCanMutateEvent,
  DashboardAccessError,
} from "@/lib/auth/dashboard-access";
import {
  clampVideoMaxDurationSeconds,
  validateCabineVirtualSettingsInput,
} from "@/lib/virtual-booth/event-config";
import {
  getEventById,
  updateEventCabineVirtualSettings,
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
      cabineVirtualEnabled?: unknown;
      cabineVirtualPhotoEnabled?: unknown;
      cabineVirtualBoomerangEnabled?: unknown;
      cabineVirtualVideoEnabled?: unknown;
      cabineVirtualVideoMaxDurationSeconds?: unknown;
      cabineVirtualCameraEnabled?: unknown;
      cabineVirtualGalleryImportEnabled?: unknown;
    };

    if (typeof body.cabineVirtualEnabled !== "boolean") {
      return Response.json(
        { error: "Configurações da Cabine Virtual inválidas." },
        { status: 400 },
      );
    }

    const settings = {
      cabineVirtualEnabled: body.cabineVirtualEnabled,
      cabineVirtualPhotoEnabled: body.cabineVirtualPhotoEnabled === true,
      cabineVirtualBoomerangEnabled:
        body.cabineVirtualBoomerangEnabled === true,
      cabineVirtualVideoEnabled: body.cabineVirtualVideoEnabled === true,
      cabineVirtualVideoMaxDurationSeconds: clampVideoMaxDurationSeconds(
        body.cabineVirtualVideoMaxDurationSeconds,
      ),
      cabineVirtualCameraEnabled:
        typeof body.cabineVirtualCameraEnabled === "boolean"
          ? body.cabineVirtualCameraEnabled
          : event.cabineVirtualCameraEnabled !== false,
      cabineVirtualGalleryImportEnabled:
        typeof body.cabineVirtualGalleryImportEnabled === "boolean"
          ? body.cabineVirtualGalleryImportEnabled
          : event.cabineVirtualGalleryImportEnabled !== false,
    };

    const validationError = validateCabineVirtualSettingsInput(settings);

    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 });
    }

    const updateResult = await updateEventCabineVirtualSettings(
      trimmedEventId,
      settings,
    ).catch((err: unknown) => {
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
        cabineVirtualEnabled: updated.cabineVirtualEnabled,
        cabineVirtualPhotoEnabled: updated.cabineVirtualPhotoEnabled,
        cabineVirtualBoomerangEnabled: updated.cabineVirtualBoomerangEnabled,
        cabineVirtualVideoEnabled: updated.cabineVirtualVideoEnabled,
        cabineVirtualVideoMaxDurationSeconds:
          updated.cabineVirtualVideoMaxDurationSeconds,
        cabineVirtualCameraEnabled: updated.cabineVirtualCameraEnabled,
        cabineVirtualGalleryImportEnabled:
          updated.cabineVirtualGalleryImportEnabled,
      },
    });
  } catch (error) {
    console.error("[VIRTUAL_BOOTH_CONFIG] erro", error);

    return Response.json(
      { error: "Não foi possível salvar as configurações." },
      { status: 500 },
    );
  }
}
