import { revalidatePath } from "next/cache";
import { softDeleteDashboardMedia } from "@/lib/dashboard/media-actions";
import { getRouteHandlerUser } from "@/lib/auth/session";

type DeleteVideoContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_request: Request, { params }: DeleteVideoContext) {
  try {
    const userOrRes = await getRouteHandlerUser();

    if (userOrRes instanceof Response) {
      return userOrRes;
    }

    const { id } = await params;

    if (!id) {
      return Response.json(
        { error: "Identificador do video nao informado." },
        { status: 400 },
      );
    }

    const result = await softDeleteDashboardMedia(userOrRes.id, id);

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/events/${encodeURIComponent(result.media.eventId)}`);
    revalidatePath(`/evento/${result.media.eventSlug}`);
    revalidatePath(`/video/${encodeURIComponent(id)}`);
    revalidatePath(`/videos/${encodeURIComponent(id)}`);

    return Response.json({
      ok: true,
      deletedVideo: result.media,
    });
  } catch (error) {
    console.error("Erro ao excluir video:", error);

    return Response.json(
      { error: "Nao foi possivel excluir o video. Tente novamente." },
      { status: 500 },
    );
  }
}
