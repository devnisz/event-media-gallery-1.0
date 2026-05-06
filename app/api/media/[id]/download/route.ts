import { suggestedDownloadFileName } from "@/lib/media/suggestedDownloadFileName";
import { safeDecodeURIComponentSegment } from "@/lib/utils/safe-decode-uri";
import { getMediaById } from "@/services/mediaService";

function buildContentDisposition(fileName: string): string {
  const asciiFallback =
    fileName.replace(/[^\x20-\x7E]/g, "_").slice(0, 180) || "download";
  const utf8 = encodeURIComponent(fileName)
    .replace(/['()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());

  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${utf8}`;
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id: rawParam } = await context.params;
    const id = safeDecodeURIComponentSegment(rawParam ?? "");
    const media = await getMediaById(id);

    if (!media) {
      return new Response("Mídia não encontrada.", { status: 404 });
    }

    const sourceUrl =
      media.downloadUrl?.trim() || media.url?.trim() || media.videoUrl?.trim();

    if (!sourceUrl) {
      return new Response("URL da mídia indisponível.", { status: 502 });
    }

    let upstream: Response;

    try {
      upstream = await fetch(sourceUrl, {
        redirect: "follow",
        headers: {
          "User-Agent": "GalleryDownloadProxy/1.0",
        },
      });
    } catch (err) {
      console.error("[MEDIA_DOWNLOAD] fetch origem falhou", {
        id,
        message: err instanceof Error ? err.message : String(err),
      });
      return new Response("Falha ao contactar o armazenamento.", { status: 502 });
    }

    if (!upstream.ok) {
      console.error("[MEDIA_DOWNLOAD] HTTP origem", {
        id,
        status: upstream.status,
        urlHost: (() => {
          try {
            return new URL(sourceUrl).host;
          } catch {
            return "(url inválida)";
          }
        })(),
      });
      return new Response("Origem devolveu erro.", { status: 502 });
    }

    const fileName = suggestedDownloadFileName(media);
    const contentType =
      upstream.headers.get("content-type") ?? "application/octet-stream";

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Disposition", buildContentDisposition(fileName));

    const len = upstream.headers.get("content-length");
    if (len) {
      headers.set("Content-Length", len);
    }

    headers.set("Cache-Control", "private, max-age=300");

    const body = upstream.body;
    if (!body) {
      const buffer = await upstream.arrayBuffer();
      return new Response(buffer, { status: 200, headers });
    }

    return new Response(body, { status: 200, headers });
  } catch (error) {
    console.error("[MEDIA_DOWNLOAD] erro não tratado", error);
    return new Response("Erro interno ao preparar o download.", { status: 500 });
  }
}
