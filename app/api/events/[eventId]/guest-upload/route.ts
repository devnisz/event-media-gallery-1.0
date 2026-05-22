import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import type { GalleryMediaRecord, MediaKind } from "@/types/media";
import { getEventById } from "@/services/eventService";
import { appendGalleryMediaRecord } from "@/services/mediaService";
import { storeGuestUploadObject } from "@/lib/r2/upload";

export const runtime = "nodejs";

const MAX_GUEST_UPLOAD_BYTES = 100 * 1024 * 1024;
const MAX_THUMBNAIL_BYTES = 3 * 1024 * 1024;

const ALLOWED_TYPES: Record<
  string,
  { extension: string; mediaType: MediaKind }
> = {
  "image/jpeg": { extension: "jpg", mediaType: "image" },
  "image/png": { extension: "png", mediaType: "image" },
  "image/webp": { extension: "webp", mediaType: "image" },
  "image/gif": { extension: "gif", mediaType: "gif" },
  "video/mp4": { extension: "mp4", mediaType: "video" },
  "video/webm": { extension: "webm", mediaType: "video" },
  "video/quicktime": { extension: "mov", mediaType: "video" },
};

const ALLOWED_THUMBNAIL_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type GuestUploadContext = {
  params: Promise<{ eventId: string }>;
};

function cleanName(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 120);
}

function revalidateEventPaths(eventId: string, eventSlug: string, mediaId: string) {
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/events/${encodeURIComponent(eventId)}`);
  revalidatePath(`/evento/${eventSlug}`);
  revalidatePath(`/video/${encodeURIComponent(mediaId)}`);
}

export async function POST(request: Request, context: GuestUploadContext) {
  try {
    const { eventId } = await context.params;
    const event = await getEventById(eventId.trim());

    if (!event) {
      return Response.json({ error: "Evento não encontrado." }, { status: 404 });
    }

    if (!event.allowGuestUpload) {
      return Response.json(
        { error: "Este evento não permite uploads públicos." },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const thumbnail = formData.get("thumbnail");

    if (!(file instanceof File)) {
      return Response.json({ error: "Arquivo não enviado." }, { status: 400 });
    }

    const typeInfo = ALLOWED_TYPES[file.type];

    if (!typeInfo) {
      return Response.json(
        { error: "Tipo de arquivo não permitido." },
        { status: 415 },
      );
    }

    if (file.size <= 0 || file.size > MAX_GUEST_UPLOAD_BYTES) {
      return Response.json(
        { error: "Arquivo maior que o limite de 100 MB." },
        { status: 413 },
      );
    }

    const mediaId = `guest_${randomUUID().replace(/-/g, "").slice(0, 18)}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    const now = new Date().toISOString();
    const url = await storeGuestUploadObject({
      bytes,
      contentType: file.type,
      eventId: event.id,
      mediaId,
      extension: typeInfo.extension,
    });
    let thumbnailUrl: string | undefined =
      typeInfo.mediaType === "video" ? undefined : url;

    if (typeInfo.mediaType === "video" && thumbnail instanceof File) {
      const thumbnailExtension = ALLOWED_THUMBNAIL_TYPES[thumbnail.type];

      if (
        thumbnailExtension &&
        thumbnail.size > 0 &&
        thumbnail.size <= MAX_THUMBNAIL_BYTES
      ) {
        thumbnailUrl = await storeGuestUploadObject({
          bytes: Buffer.from(await thumbnail.arrayBuffer()),
          contentType: thumbnail.type,
          eventId: event.id,
          mediaId: `${mediaId}_thumb`,
          extension: thumbnailExtension,
        });
      }
    }
    const fallbackName =
      typeInfo.mediaType === "video"
        ? "Vídeo enviado por convidado"
        : "Foto enviada por convidado";
    const record: GalleryMediaRecord = {
      id: mediaId,
      eventId: event.id,
      eventSlug: event.slug,
      ownerUserId: event.ownerUserId,
      name: cleanName(file.name) || fallbackName,
      url,
      qrCode: "",
      mediaType: typeInfo.mediaType,
      fileType: file.type,
      mediaSource: "guest",
      thumbnailUrl,
      createdAt: now,
      uploadedAt: now,
      isHidden: false,
      isFavorite: false,
    };

    await appendGalleryMediaRecord(record);
    revalidateEventPaths(event.id, event.slug, mediaId);

    return Response.json({ ok: true, media: record }, { status: 201 });
  } catch (error) {
    console.error("[GUEST_UPLOAD] erro", error);
    const message = error instanceof Error ? error.message : "";

    if (message.includes("Storage de upload publico nao configurado")) {
      return Response.json({ error: message }, { status: 500 });
    }

    return Response.json(
      { error: "Não foi possível enviar o arquivo." },
      { status: 500 },
    );
  }
}
