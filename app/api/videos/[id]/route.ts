import { revalidatePath } from "next/cache";
import { deleteGalleryVideo } from "@/services/videoService";

type DeleteVideoContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_request: Request, { params }: DeleteVideoContext) {
  try {
    const { id } = await params;

    if (!id) {
      return Response.json(
        { error: "Identificador do video nao informado." },
        { status: 400 },
      );
    }

    const deletedVideo = await deleteGalleryVideo(id);

    if (!deletedVideo) {
      return Response.json(
        { error: "Video nao encontrado na galeria." },
        { status: 404 },
      );
    }

    revalidatePath("/");
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
