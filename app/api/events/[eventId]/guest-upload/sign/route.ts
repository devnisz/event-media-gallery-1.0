import { randomUUID } from "crypto";
import { getEventById } from "@/services/eventService";
import {
  buildGuestUploadKey,
  createGuestUploadR2Client,
  createGuestUploadSignedPutUrl,
} from "@/lib/r2/upload";
import {
  ALLOWED_GUEST_THUMBNAIL_TYPES,
  ALLOWED_GUEST_UPLOAD_TYPES,
  MAX_GUEST_UPLOAD_BYTES,
  MAX_THUMBNAIL_BYTES,
} from "@/lib/guest-upload/validation";

export const runtime = "nodejs";

type GuestUploadSignContext = {
  params: Promise<{ eventId: string }>;
};

export async function POST(request: Request, context: GuestUploadSignContext) {
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

    const r2 = createGuestUploadR2Client();

    if (!r2) {
      return Response.json(
        {
          error:
            "Storage de upload publico nao configurado. Defina R2_PUBLIC_BASE_URL e credenciais R2.",
        },
        { status: 500 },
      );
    }

    const body = (await request.json()) as {
      fileType?: unknown;
      fileSize?: unknown;
      hasThumbnail?: unknown;
      thumbnailType?: unknown;
      thumbnailSize?: unknown;
    };
    const fileType = typeof body.fileType === "string" ? body.fileType : "";
    const fileSize =
      typeof body.fileSize === "number" && Number.isFinite(body.fileSize)
        ? body.fileSize
        : 0;
    const typeInfo = ALLOWED_GUEST_UPLOAD_TYPES[fileType];

    if (!typeInfo) {
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

    const mediaId = `guest_${randomUUID().replace(/-/g, "").slice(0, 18)}`;
    const key = buildGuestUploadKey({
      keyPrefix: r2.keyPrefix,
      eventId: event.id,
      mediaId,
      extension: typeInfo.extension,
    });
    const signed = await createGuestUploadSignedPutUrl({
      key,
      contentType: fileType,
    });
    let thumbnail:
      | {
          uploadUrl: string;
          publicUrl: string;
          key: string;
        }
      | undefined;
    const thumbnailType =
      typeof body.thumbnailType === "string" ? body.thumbnailType : "";
    const thumbnailSize =
      typeof body.thumbnailSize === "number" && Number.isFinite(body.thumbnailSize)
        ? body.thumbnailSize
        : 0;
    const thumbnailExtension = ALLOWED_GUEST_THUMBNAIL_TYPES[thumbnailType];

    if (
      body.hasThumbnail === true &&
      thumbnailExtension &&
      thumbnailSize > 0 &&
      thumbnailSize <= MAX_THUMBNAIL_BYTES
    ) {
      const thumbnailKey = buildGuestUploadKey({
        keyPrefix: r2.keyPrefix,
        eventId: event.id,
        mediaId: `${mediaId}_thumb`,
        extension: thumbnailExtension,
      });
      const thumbnailSigned = await createGuestUploadSignedPutUrl({
        key: thumbnailKey,
        contentType: thumbnailType,
      });

      thumbnail = {
        ...thumbnailSigned,
        key: thumbnailKey,
      };
    }

    return Response.json({
      ok: true,
      mediaId,
      upload: {
        ...signed,
        key,
      },
      thumbnail,
    });
  } catch (error) {
    console.error("[GUEST_UPLOAD_SIGN] erro", error);

    return Response.json(
      { error: "Não foi possível preparar o upload." },
      { status: 500 },
    );
  }
}
