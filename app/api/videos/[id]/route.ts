import { revalidatePath } from "next/cache";
import { deleteGalleryVideo } from "@/services/videoService";
import { readGalleryVideosRaw } from "@/services/mediaService";
import { getEventById } from "@/services/eventService";
import { getRouteHandlerUser } from "@/lib/auth/session";
import { assertUserCanMutateMediaForEvent, DashboardAccessError } from "@/lib/auth/dashboard-access";

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

    const galleryMedia = await readGalleryVideosRaw();
    const item = galleryMedia.find((v) => v.id === id);

    const event = item ? await getEventById(item.eventId) : undefined;

    try {
      assertUserCanMutateMediaForEvent(userOrRes.id, item, event);
    } catch (err) {
      if (err instanceof DashboardAccessError) {
        return Response.json({ error: err.message }, { status: err.status });
      }

      throw err;
    }

    const deletedVideo = await deleteGalleryVideo(id);

    if (!deletedVideo) {
      return Response.json(
        { error: "Video nao encontrado na galeria." },
        { status: 404 },
      );
    }

    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath(`/evento/${deletedVideo.eventSlug}`);
    revalidatePath(`/video/${encodeURIComponent(id)}`);
    revalidatePath(`/videos/${encodeURIComponent(id)}`);

    return Response.json({
      ok: true,
      deletedVideo,
    });
  } catch (error) {
    console.error("Erro ao excluir video:", error);

    return Response.json(
      { error: "Nao foi possivel excluir o video. Tente novamente." },
      { status: 500 },
    );
  }
}
