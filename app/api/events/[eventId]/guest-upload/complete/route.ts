import { revalidatePath } from "next/cache";
import type { GalleryMediaRecord, MediaKind } from "@/types/media";
import { getEventById } from "@/services/eventService";
import { appendGalleryMediaRecord } from "@/services/mediaService";
import { generateAndStoreMediaQrCode } from "@/lib/media/qr-code";
import {
  ALLOWED_GUEST_UPLOAD_TYPES,
  cleanGuestUploadName,
  MAX_GUEST_UPLOAD_BYTES,
} from "@/lib/guest-upload/validation";

export const runtime = "nodejs";

type GuestUploadCompleteContext = {
  params: Promise<{ eventId: string }>;
};

function resolveGuestMediaType(
  fileType: string,
  fileName: string,
): MediaKind | null {
  const typeInfo = ALLOWED_GUEST_UPLOAD_TYPES[fileType];

  if (!typeInfo) {
    return null;
  }

  if (typeInfo.mediaType === "gif" && /boomerang/i.test(fileName)) {
    return "boomerang";
  }

  return typeInfo.mediaType;
}

function revalidateEventPaths(eventId: string, eventSlug: string, mediaId: string) {
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/events/${encodeURIComponent(eventId)}`);
  revalidatePath(`/evento/${eventSlug}`);
  revalidatePath(`/video/${encodeURIComponent(mediaId)}`);
}

export async function POST(
  request: Request,
  context: GuestUploadCompleteContext,
) {
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

    const body = (await request.json()) as {
      mediaId?: unknown;
      fileName?: unknown;
      fileType?: unknown;
      fileSize?: unknown;
      publicUrl?: unknown;
      thumbnailUrl?: unknown;
    };
    const mediaId = typeof body.mediaId === "string" ? body.mediaId.trim() : "";
    const fileName = typeof body.fileName === "string" ? body.fileName : "";
    const fileType = typeof body.fileType === "string" ? body.fileType : "";
    const fileSize =
      typeof body.fileSize === "number" && Number.isFinite(body.fileSize)
        ? body.fileSize
        : 0;
    const publicUrl =
      typeof body.publicUrl === "string" ? body.publicUrl.trim() : "";
    const thumbnailUrl =
      typeof body.thumbnailUrl === "string" && body.thumbnailUrl.trim()
        ? body.thumbnailUrl.trim()
        : undefined;
    const mediaType = resolveGuestMediaType(fileType, fileName);

    if (!/^guest_[a-f0-9]{18}$/.test(mediaId)) {
      return Response.json({ error: "Upload inválido." }, { status: 400 });
    }

    if (!mediaType) {
      return Response.json(
        { error: "Tipo de arquivo não permitido." },
        { status: 415 },
      );
    }

    if (fileSize <= 0 || fileSize > MAX_GUEST_UPLOAD_BYTES) {
      return Response.json(
        { error: "Arquivo maior que o limite de 100 MB." },
        { status: 413 },
      );
    }

    if (!publicUrl.startsWith("https://")) {
      return Response.json({ error: "URL pública inválida." }, { status: 400 });
    }

    const now = new Date().toISOString();
    let qrCode = "";

    try {
      qrCode = await generateAndStoreMediaQrCode(mediaId);
    } catch (error) {
      console.error("[GUEST_UPLOAD_COMPLETE] QR Code falhou", error);
    }

    const fallbackName =
      mediaType === "video"
        ? "Vídeo enviado por convidado"
        : mediaType === "boomerang"
          ? "Boomerang enviado por convidado"
          : mediaType === "gif"
            ? "GIF enviado por convidado"
            : "Foto enviada por convidado";
    const record: GalleryMediaRecord = {
      id: mediaId,
      eventId: event.id,
      eventSlug: event.slug,
      ownerUserId: event.ownerUserId,
      name: cleanGuestUploadName(fileName) || fallbackName,
      url: publicUrl,
      qrCode,
      mediaType,
      fileType,
      mediaSource: "guest",
      reviewStatus: event.requireGuestUploadApproval ? "pending" : "approved",
      thumbnailUrl: thumbnailUrl ?? (mediaType === "video" ? undefined : publicUrl),
      createdAt: now,
      uploadedAt: now,
      isHidden: false,
      isFavorite: false,
    };

    await appendGalleryMediaRecord(record);
    revalidateEventPaths(event.id, event.slug, mediaId);

    return Response.json({ ok: true, media: record }, { status: 201 });
  } catch (error) {
    console.error("[GUEST_UPLOAD_COMPLETE] erro", error);

    return Response.json(
      { error: "Não foi possível finalizar o upload." },
      { status: 500 },
    );
  }
}
