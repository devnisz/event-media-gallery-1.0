import { revalidatePath } from "next/cache";
import {
  deleteEventAndRelatedAssets,
  EventNotFoundDeletionError,
} from "@/services/eventDeletionService";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await context.params;

    if (!eventId?.trim()) {
      return Response.json({ error: "eventId inválido." }, { status: 400 });
    }

    const report = await deleteEventAndRelatedAssets(eventId.trim());

    revalidatePath("/");
    revalidatePath("/admin");
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
