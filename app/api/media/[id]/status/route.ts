import { getMediaPublicStatus } from "@/lib/media/media-public-status";
import { safeDecodeURIComponentSegment } from "@/lib/utils/safe-decode-uri";

export const runtime = "nodejs";

type MediaStatusContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: MediaStatusContext) {
  try {
    const { id: rawParam } = await context.params;
    const id = safeDecodeURIComponentSegment(rawParam ?? "").trim();

    if (!id) {
      return Response.json(
        { error: "Identificador de mídia inválido." },
        { status: 400 },
      );
    }

    const status = await getMediaPublicStatus(id);
    return Response.json(status);
  } catch (error) {
    console.error("[MEDIA_STATUS] erro", error);

    return Response.json(
      { error: "Não foi possível consultar o status da mídia." },
      { status: 500 },
    );
  }
}
