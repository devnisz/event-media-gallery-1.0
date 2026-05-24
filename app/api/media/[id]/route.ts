import { revalidatePath } from "next/cache";
import {
  isValidReviewStatus,
  softDeleteDashboardMedia,
  updateDashboardMediaState,
} from "@/lib/dashboard/media-actions";
import { getRouteHandlerUser } from "@/lib/auth/session";

type MediaRouteContext = {
  params: Promise<{ id: string }>;
};

function revalidateMediaPaths(media: {
  id: string;
  eventId: string;
  eventSlug: string;
}) {
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/events/${encodeURIComponent(media.eventId)}`);
  revalidatePath(`/evento/${media.eventSlug}`);
  revalidatePath(`/video/${encodeURIComponent(media.id)}`);
}

export async function PATCH(request: Request, context: MediaRouteContext) {
  try {
    const userOrRes = await getRouteHandlerUser();

    if (userOrRes instanceof Response) {
      return userOrRes;
    }

    const { id } = await context.params;
    const body = (await request.json()) as {
      isHidden?: unknown;
      isFavorite?: unknown;
      reviewStatus?: unknown;
    };
    const patch: {
      isHidden?: boolean;
      isFavorite?: boolean;
      reviewStatus?: "approved" | "pending" | "rejected";
    } = {};

    if (typeof body.isHidden === "boolean") {
      patch.isHidden = body.isHidden;
    }

    if (typeof body.isFavorite === "boolean") {
      patch.isFavorite = body.isFavorite;
    }

    if (isValidReviewStatus(body.reviewStatus)) {
      patch.reviewStatus = body.reviewStatus;
    }

    if (Object.keys(patch).length === 0) {
      return Response.json(
        { error: "Nenhuma alteração válida informada." },
        { status: 400 },
      );
    }

    const result = await updateDashboardMediaState(userOrRes.id, id, patch);

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    revalidateMediaPaths(result.media);

    return Response.json({ ok: true, media: result.media });
  } catch (error) {
    console.error("[MEDIA_PATCH] erro", error);

    return Response.json(
      { error: "Não foi possível atualizar a mídia." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: MediaRouteContext) {
  try {
    const userOrRes = await getRouteHandlerUser();

    if (userOrRes instanceof Response) {
      return userOrRes;
    }

    const { id } = await context.params;
    const result = await softDeleteDashboardMedia(userOrRes.id, id);

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    revalidateMediaPaths(result.media);

    return Response.json({ ok: true, deletedMedia: result.media });
  } catch (error) {
    console.error("[MEDIA_DELETE] erro", error);

    return Response.json(
      { error: "Não foi possível excluir a mídia." },
      { status: 500 },
    );
  }
}
