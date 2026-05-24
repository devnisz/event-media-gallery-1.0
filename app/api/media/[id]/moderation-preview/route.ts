import { resolveDashboardMediaForPreview } from "@/lib/dashboard/media-actions";
import { getRouteHandlerUser } from "@/lib/auth/session";

export const runtime = "nodejs";

type ModerationPreviewContext = {
  params: Promise<{ id: string }>;
};

function sourceUrlForRequest(source: string, requestUrl: string): string {
  if (/^https?:\/\//i.test(source)) {
    return source;
  }

  return new URL(source, requestUrl).toString();
}

function copyHeader(
  source: Headers,
  target: Headers,
  name: string,
): void {
  const value = source.get(name);

  if (value) {
    target.set(name, value);
  }
}

export async function GET(
  request: Request,
  context: ModerationPreviewContext,
) {
  try {
    const userOrRes = await getRouteHandlerUser();

    if (userOrRes instanceof Response) {
      return userOrRes;
    }

    const { id } = await context.params;
    const result = await resolveDashboardMediaForPreview(userOrRes.id, id);

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    const source = result.media.url.trim();

    if (!source) {
      return Response.json(
        { error: "URL da mídia indisponível." },
        { status: 502 },
      );
    }

    const range = request.headers.get("range");
    const upstream = await fetch(sourceUrlForRequest(source, request.url), {
      redirect: "follow",
      headers: range ? { Range: range } : undefined,
    });

    if (!upstream.ok && upstream.status !== 206) {
      return Response.json(
        { error: "Não foi possível carregar o preview." },
        { status: 502 },
      );
    }

    const headers = new Headers();
    headers.set(
      "Content-Type",
      upstream.headers.get("content-type") ||
        result.media.fileType ||
        "application/octet-stream",
    );
    headers.set("Cache-Control", "private, no-store");
    headers.set("Accept-Ranges", upstream.headers.get("accept-ranges") || "bytes");
    copyHeader(upstream.headers, headers, "content-length");
    copyHeader(upstream.headers, headers, "content-range");

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    console.error("[MEDIA_MODERATION_PREVIEW] erro", error);

    return Response.json(
      { error: "Não foi possível carregar o preview." },
      { status: 500 },
    );
  }
}
