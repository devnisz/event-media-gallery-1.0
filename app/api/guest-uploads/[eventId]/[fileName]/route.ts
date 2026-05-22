import { readFile } from "fs/promises";
import path from "path";
import { galleryPublicPath } from "@/lib/paths";

export const runtime = "nodejs";

type GuestUploadAssetContext = {
  params: Promise<{
    eventId: string;
    fileName: string;
  }>;
};

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

function cleanSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
}

export async function GET(_request: Request, context: GuestUploadAssetContext) {
  const { eventId, fileName } = await context.params;
  const safeEventId = cleanSegment(eventId);
  const safeFileName = cleanSegment(fileName);
  const baseDir = galleryPublicPath("guest-uploads");
  const filePath = path.join(baseDir, safeEventId, safeFileName);
  const relative = path.relative(baseDir, filePath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return Response.json({ error: "Arquivo inválido." }, { status: 400 });
  }

  try {
    const bytes = await readFile(filePath);
    const ext = path.extname(safeFileName).toLowerCase();

    return new Response(bytes, {
      headers: {
        "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return Response.json({ error: "Arquivo não encontrado." }, { status: 404 });
    }

    console.error("[GUEST_UPLOAD_ASSET] erro", error);

    return Response.json(
      { error: "Não foi possível carregar o arquivo." },
      { status: 500 },
    );
  }
}
