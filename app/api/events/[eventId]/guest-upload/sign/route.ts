import { randomUUID } from "crypto";
import { getEventById } from "@/services/eventService";
import { readEventsLooseForHydration } from "@/repositories/eventRepository";
import { createServiceRoleSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  buildGuestUploadKey,
  createGuestUploadR2Client,
  createGuestUploadSignedPutUrl,
} from "@/lib/r2/upload";
import {
  ALLOWED_GUEST_THUMBNAIL_TYPES,
  MAX_GUEST_UPLOAD_BYTES,
  MAX_THUMBNAIL_BYTES,
  normalizeGuestUploadMimeType,
  resolveGuestUploadTypeInfo,
} from "@/lib/guest-upload/validation";

export const runtime = "nodejs";

type GuestUploadSignContext = {
  params: Promise<{ eventId: string }>;
};

/**
 * TEMP diagnóstico (ETAPA 6): mesma fonte de getEventById / readEvents,
 * filtrando pelo eventId da URL — sem consultar por slug.
 */
async function diagLoadRawByEventId(eventId: string): Promise<{
  source: string;
  row: {
    id: string;
    slug: string;
    allow_guest_upload: boolean | null;
    upload_token: string | null;
  } | null;
}> {
  if (isSupabaseConfigured()) {
    const client = createServiceRoleSupabase();
    if (client) {
      const { data, error } = await client
        .from("events")
        .select("id, slug, allow_guest_upload, upload_token")
        .eq("id", eventId)
        .maybeSingle();

      if (!error) {
        return {
          source: "supabase.events.eq(id)",
          row: data
            ? {
                id: String(data.id),
                slug: String(data.slug ?? ""),
                allow_guest_upload:
                  typeof data.allow_guest_upload === "boolean"
                    ? data.allow_guest_upload
                    : null,
                upload_token:
                  typeof data.upload_token === "string"
                    ? data.upload_token
                    : null,
              }
            : null,
        };
      }

      console.warn("[EventChainDiag] ETAPA6 supabase select falhou", {
        message: error.message,
        code: error.code,
      });
    }
  }

  const loose = await readEventsLooseForHydration();
  const found = loose.find((e) => e.id === eventId) ?? null;
  return {
    source: "readEventsLooseForHydration.find(id)",
    row: found
      ? {
          id: found.id,
          slug: found.slug,
          allow_guest_upload:
            typeof found.allowGuestUpload === "boolean"
              ? found.allowGuestUpload
              : null,
          upload_token:
            typeof found.uploadToken === "string" ? found.uploadToken : null,
        }
      : null,
  };
}

export async function POST(request: Request, context: GuestUploadSignContext) {
  try {
    const { eventId } = await context.params;
    const eventIdFromUrl = eventId.trim();

    // TEMP ETAPA 4
    console.info("[EventChainDiag] ETAPA4 sign URL eventId", {
      eventIdFromUrl,
    });

    const event = await getEventById(eventIdFromUrl);

    // TEMP ETAPA 5
    console.info("[EventChainDiag] ETAPA5 getEventById", {
      found: Boolean(event),
      eventId: event?.id ?? null,
      slug: event?.slug ?? null,
      allowGuestUpload: event?.allowGuestUpload ?? null,
      uploadToken: event?.uploadToken
        ? `(present, len=${event.uploadToken.length})`
        : null,
    });

    // TEMP ETAPA 6 + 7
    const raw = await diagLoadRawByEventId(eventIdFromUrl);
    console.info("[EventChainDiag] ETAPA6 raw source by eventId", {
      source: raw.source,
      id: raw.row?.id ?? null,
      slug: raw.row?.slug ?? null,
      allow_guest_upload: raw.row?.allow_guest_upload ?? null,
      upload_token: raw.row?.upload_token
        ? `(present, len=${raw.row.upload_token.length})`
        : null,
    });

    const ids = {
      eventIdFromUrl,
      getEventById_id: event?.id ?? null,
      rawRow_id: raw.row?.id ?? null,
    };
    const allEqual =
      Boolean(ids.eventIdFromUrl) &&
      ids.eventIdFromUrl === ids.getEventById_id &&
      ids.eventIdFromUrl === ids.rawRow_id;

    console.info("[EventChainDiag] ETAPA7 comparação IDs (Gallery)", {
      ...ids,
      result: allEqual ? "IGUAIS" : "DIFERENTES",
      allowGuestUpload_hydrated: event?.allowGuestUpload ?? null,
      allow_guest_upload_raw: raw.row?.allow_guest_upload ?? null,
    });

    if (!event) {
      return Response.json({ error: "Evento não encontrado." }, { status: 404 });
    }

    // Regra inalterada: só permite guest-upload quando allowGuestUpload === true.
    if (event.allowGuestUpload !== true) {
      console.info("[EventChainDiag] ETAPA8 403 allowGuestUpload falsy", {
        eventId: event.id,
        allowGuestUpload: event.allowGuestUpload,
        allow_guest_upload_raw: raw.row?.allow_guest_upload ?? null,
        source: raw.source,
        note:
          "Valor lido de getEventById → listPersistedEventsHydrated → " +
          "events.allow_guest_upload (ou JSON). Default create = false. " +
          "Dashboard PATCH grava a mesma coluna allow_guest_upload.",
      });
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
    const fileType = normalizeGuestUploadMimeType(
      typeof body.fileType === "string" ? body.fileType : "",
    );
    const fileSize =
      typeof body.fileSize === "number" && Number.isFinite(body.fileSize)
        ? body.fileSize
        : 0;
    const typeInfo = resolveGuestUploadTypeInfo(fileType);

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
