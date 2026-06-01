/**
 * Persistência de eventos: Supabase quando configurado, com fallback JSON.
 */
import { normalizeGalleryLayout } from "@/lib/gallery/layout";
import { clampVideoMaxDurationSeconds } from "@/lib/virtual-booth/event-config";
import type { GalleryEventRecord, StoredEventLoose } from "@/types/event";
import {
  createServiceRoleSupabase,
  createServiceRoleSupabaseResult,
  getSupabaseServerKeyMode,
  peekSupabaseKeyJwtRole,
} from "@/lib/supabase/server";
import {
  getSupabaseEnvDiagnostics,
  isSupabaseConfigured,
  isVercelDeployment,
  logFallback,
  logMigration,
  logRepository,
  logSupabase,
  logSupabaseEnvCheck,
  shouldDualWriteLegacyJson,
  shouldPersistLegacyJsonFiles,
} from "@/lib/supabase/config";
import {
  readEventsFromStorage,
  writeEventsToStorage,
} from "@/services/storageService";
import type { SupabaseClient } from "@supabase/supabase-js";

type EventRow = {
  id: string;
  slug: string;
  name: string;
  upload_token: string;
  created_at: string;
  cover_image: string | null;
  videos_count: number | null;
  owner_user_id: string | null;
  allow_public_delete?: boolean | null;
  require_delete_pin?: boolean | null;
  delete_pin_hash?: string | null;
  allow_guest_upload?: boolean | null;
  require_guest_upload_approval?: boolean | null;
  frame_url?: string | null;
  gallery_layout?: string | null;
  cabine_virtual_enabled?: boolean | null;
  cabine_virtual_photo_enabled?: boolean | null;
  cabine_virtual_boomerang_enabled?: boolean | null;
  cabine_virtual_video_enabled?: boolean | null;
  cabine_virtual_video_max_duration_seconds?: number | null;
  cabine_virtual_camera_enabled?: boolean | null;
  cabine_virtual_gallery_import_enabled?: boolean | null;
  live_moments_enabled?: boolean | null;
  allow_likes?: boolean | null;
  allow_media_share?: boolean | null;
  view_count?: number | null;
  download_count?: number | null;
  share_count?: number | null;
};

export type PersistEventsOutcome = {
  branch:
    | "json_not_configured"
    | "json_no_client"
    | "supabase_success"
    | "supabase_success_dual_json"
    | "supabase_failed_json_fallback";
  isSupabaseConfigured: boolean;
  supabaseClientCreated: boolean;
  keyMode: "service" | "anon" | "none";
  repositoryLabel: string;
  upsertAttempted: boolean;
  upsertRowCount: number;
  upsertPayload?: EventRow[];
  supabaseUpsertData?: unknown;
  supabaseError?: {
    message: string;
    code?: string;
    details?: string;
    hint?: string;
  };
  syncFailedPhase?: string;
  jsonWritten: boolean;
  usedFallbackJson: boolean;
  errorStack?: string;
};

function serializeSupabaseError(
  err: unknown,
): NonNullable<PersistEventsOutcome["supabaseError"]> {
  if (err && typeof err === "object" && "message" in err) {
    const o = err as Record<string, unknown>;

    return {
      message: String(o.message),
      code: o.code !== undefined ? String(o.code) : undefined,
      details: o.details !== undefined ? String(o.details) : undefined,
      hint: o.hint !== undefined ? String(o.hint) : undefined,
    };
  }

  return { message: String(err) };
}

function formatSupabaseErrorForThrow(
  ser: NonNullable<PersistEventsOutcome["supabaseError"]>,
): string {
  const parts = [
    ser.message,
    ser.code ? `code=${ser.code}` : "",
    ser.details ? `details=${ser.details}` : "",
    ser.hint ? `hint=${ser.hint}` : "",
  ].filter(Boolean);

  const detail = parts.join(" | ");
  const missingColumn = detail.match(
    /Could not find the '([^']+)' column of 'events'/i,
  )?.[1];
  const needsEventsSchemaUpdate =
    missingColumn !== undefined ||
    /PGRST204/i.test(detail) ||
    /cabine_virtual_|live_moments_enabled|allow_likes|allow_media_share/i.test(detail) ||
    /column.*events.*does not exist/i.test(detail);

  if (needsEventsSchemaUpdate) {
    const columnHint = missingColumn
      ? ` Coluna ausente: ${missingColumn}.`
      : "";

    return `${detail}.${columnHint} Execute no Supabase (SQL Editor) supabase/apply-event-feature-columns.sql e supabase/migrations/20260530120000_media_likes.sql. Depois: Settings → API → Reload schema (ou aguarde ~1 min) e tente salvar de novo.`;
  }

  return detail;
}

function optionalBoolean(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

function optionalTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function rowToLoose(row: EventRow): StoredEventLoose {
  const deletePinHash = optionalTrimmedString(row.delete_pin_hash);

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at,
    uploadToken: row.upload_token,
    coverImage: row.cover_image ?? "",
    videosCount: row.videos_count ?? 0,
    allowPublicDelete: optionalBoolean(row.allow_public_delete),
    requireDeletePin: optionalBoolean(row.require_delete_pin),
    allowGuestUpload: optionalBoolean(row.allow_guest_upload),
    requireGuestUploadApproval: optionalBoolean(row.require_guest_upload_approval),
    frameUrl: optionalTrimmedString(row.frame_url),
    galleryLayout: normalizeGalleryLayout(row.gallery_layout),
    ...(typeof row.cabine_virtual_enabled === "boolean"
      ? { cabineVirtualEnabled: row.cabine_virtual_enabled }
      : {}),
    ...(typeof row.cabine_virtual_photo_enabled === "boolean"
      ? { cabineVirtualPhotoEnabled: row.cabine_virtual_photo_enabled }
      : {}),
    ...(typeof row.cabine_virtual_boomerang_enabled === "boolean"
      ? { cabineVirtualBoomerangEnabled: row.cabine_virtual_boomerang_enabled }
      : {}),
    ...(typeof row.cabine_virtual_video_enabled === "boolean"
      ? { cabineVirtualVideoEnabled: row.cabine_virtual_video_enabled }
      : {}),
    ...(typeof row.cabine_virtual_video_max_duration_seconds === "number"
      ? {
          cabineVirtualVideoMaxDurationSeconds: clampVideoMaxDurationSeconds(
            row.cabine_virtual_video_max_duration_seconds,
          ),
        }
      : {}),
    ...(typeof row.cabine_virtual_camera_enabled === "boolean"
      ? { cabineVirtualCameraEnabled: row.cabine_virtual_camera_enabled }
      : {}),
    ...(typeof row.cabine_virtual_gallery_import_enabled === "boolean"
      ? {
          cabineVirtualGalleryImportEnabled:
            row.cabine_virtual_gallery_import_enabled,
        }
      : {}),
    ...(typeof row.live_moments_enabled === "boolean"
      ? { liveMomentsEnabled: row.live_moments_enabled }
      : {}),
    ...(typeof row.allow_likes === "boolean"
      ? { allowLikes: row.allow_likes }
      : {}),
    ...(typeof row.allow_media_share === "boolean"
      ? { allowMediaShare: row.allow_media_share }
      : {}),
    ...(typeof row.view_count === "number"
      ? { viewCount: Math.max(0, Math.trunc(row.view_count)) }
      : {}),
    ...(typeof row.download_count === "number"
      ? { downloadCount: Math.max(0, Math.trunc(row.download_count)) }
      : {}),
    ...(typeof row.share_count === "number"
      ? { shareCount: Math.max(0, Math.trunc(row.share_count)) }
      : {}),
    ...(deletePinHash ? { deletePinHash } : {}),
    ...(row.owner_user_id
      ? { ownerUserId: row.owner_user_id }
      : {}),
  };
}

function eventToRow(e: GalleryEventRecord): EventRow {
  return {
    id: e.id,
    slug: e.slug,
    name: e.name,
    upload_token: e.uploadToken,
    created_at: e.createdAt,
    cover_image: e.coverImage ?? "",
    videos_count: e.videosCount ?? 0,
    owner_user_id: e.ownerUserId?.trim() ? e.ownerUserId.trim() : null,
    allow_public_delete: e.allowPublicDelete,
    require_delete_pin: e.requireDeletePin,
    delete_pin_hash: e.deletePinHash?.trim() ? e.deletePinHash.trim() : null,
    allow_guest_upload: e.allowGuestUpload,
    require_guest_upload_approval: e.requireGuestUploadApproval,
    frame_url: e.frameUrl ?? "",
    gallery_layout: normalizeGalleryLayout(e.galleryLayout),
    cabine_virtual_enabled: e.cabineVirtualEnabled === true,
    cabine_virtual_photo_enabled: e.cabineVirtualPhotoEnabled === true,
    cabine_virtual_boomerang_enabled: e.cabineVirtualBoomerangEnabled === true,
    cabine_virtual_video_enabled: e.cabineVirtualVideoEnabled === true,
    cabine_virtual_video_max_duration_seconds: clampVideoMaxDurationSeconds(
      e.cabineVirtualVideoMaxDurationSeconds,
    ),
    cabine_virtual_camera_enabled: e.cabineVirtualCameraEnabled !== false,
    cabine_virtual_gallery_import_enabled:
      e.cabineVirtualGalleryImportEnabled !== false,
    live_moments_enabled: e.liveMomentsEnabled === true,
    allow_likes: e.allowLikes === true,
    allow_media_share: e.allowMediaShare !== false,
    ...(typeof e.viewCount === "number"
      ? { view_count: Math.max(0, Math.trunc(e.viewCount)) }
      : {}),
    ...(typeof e.downloadCount === "number"
      ? { download_count: Math.max(0, Math.trunc(e.downloadCount)) }
      : {}),
    ...(typeof e.shareCount === "number"
      ? { share_count: Math.max(0, Math.trunc(e.shareCount)) }
      : {}),
  };
}

async function loadEventsFromSupabase(
  client: SupabaseClient,
): Promise<StoredEventLoose[]> {
  const { data, error } = await client
    .from("events")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data as EventRow[] | null)?.map(rowToLoose) ?? [];
}

type SyncFail = {
  ok: false;
  phase: string;
  error: unknown;
  rows: EventRow[];
};

type SyncOk = {
  ok: true;
  upsertData: unknown;
  rows: EventRow[];
};

async function syncEventsToSupabase(
  client: SupabaseClient,
  events: GalleryEventRecord[],
): Promise<SyncOk | SyncFail> {
  const keep = new Set(events.map((e) => e.id));
  const rows = events.map(eventToRow);

  logRepository("syncEventsToSupabase: início", {
    eventCount: events.length,
    rowCount: rows.length,
  });

  const { data: existing, error: selErr } = await client
    .from("events")
    .select("id");

  if (selErr) {
    logRepository("syncEventsToSupabase: select ids falhou", selErr);
    logSupabase("erro Supabase (select ids)", serializeSupabaseError(selErr));

    return { ok: false, phase: "select_ids", error: selErr, rows };
  }

  const stale =
    (existing as { id: string }[] | null)
      ?.map((r) => r.id)
      .filter((id) => !keep.has(id)) ?? [];

  if (stale.length > 0) {
    logRepository("syncEventsToSupabase: removendo ids obsoletos", {
      count: stale.length,
    });
    const { error: delErr } = await client.from("events").delete().in("id", stale);

    if (delErr) {
      logRepository("syncEventsToSupabase: delete stale falhou", delErr);
      logSupabase("erro Supabase (delete)", serializeSupabaseError(delErr));

      return { ok: false, phase: "delete_stale", error: delErr, rows };
    }
  }

  if (rows.length === 0) {
    logRepository("syncEventsToSupabase: sem linhas para upsert — fim");

    return { ok: true, upsertData: null, rows: [] };
  }

  logRepository("syncEventsToSupabase: payload upsert", { rows });

  const { data: upData, error: upErr } = await client
    .from("events")
    .upsert(rows, { onConflict: "id" })
    .select();

  if (upErr) {
    const serialized = serializeSupabaseError(upErr);

    logRepository("syncEventsToSupabase: upsert retornou erro", {
      error: upErr,
      serialized,
      payload: rows,
    });
    logSupabase("erro Supabase (upsert) detalhe completo", upErr);

    return { ok: false, phase: "upsert", error: upErr, rows };
  }

  logRepository("syncEventsToSupabase: upsert OK", {
    returnedRowCount: Array.isArray(upData) ? upData.length : null,
    data: upData,
  });

  return { ok: true, upsertData: upData, rows };
}

/** Leitura bruta para hidratação de `uploadToken` (tokenService). */
export async function readEventsLooseForHydration(): Promise<StoredEventLoose[]> {
  if (!isSupabaseConfigured()) {
    logMigration("events read → JSON (Supabase não configurado)");
    return (await readEventsFromStorage()) as StoredEventLoose[];
  }

  const client = createServiceRoleSupabase();

  if (!client) {
    logMigration("events read → JSON (cliente Supabase nulo)");
    return (await readEventsFromStorage()) as StoredEventLoose[];
  }

  try {
    const rows = await loadEventsFromSupabase(client);
    logRepository(`events carregados do Supabase: ${rows.length} linha(s)`);

    return rows;
  } catch (err) {
    const stack = err instanceof Error ? err.stack : undefined;

    if (isVercelDeployment()) {
      logFallback("events read: Supabase falhou na Vercel — sem fallback JSON neste ambiente", {
        error: err,
        stack,
        serialized: serializeSupabaseError(err),
      });
      throw err instanceof Error
        ? err
        : new Error(String(err));
    }

    logFallback("events read: Supabase falhou → fallback JSON", {
      error: err,
      stack,
      serialized: serializeSupabaseError(err),
    });
    logMigration("events Supabase falhou → fallback JSON", err);
    const json = await readEventsFromStorage();

    return json as StoredEventLoose[];
  }
}

/** Substitui o conjunto completo de eventos (espelha o modelo JSON array). */
export async function persistEventsFullReplace(
  events: GalleryEventRecord[],
): Promise<PersistEventsOutcome> {
  logSupabaseEnvCheck();
  const envDiag = getSupabaseEnvDiagnostics();

  logSupabase(
    `persistEventsFullReplace start isSupabaseConfigured=${isSupabaseConfigured()} hasUrl=${envDiag.hasUrl} hasAnonKey=${envDiag.hasAnonKey} hasServiceRole=${envDiag.hasServiceRole} serviceRoleJwtRole=${peekSupabaseKeyJwtRole(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "") ?? "n/a"}`,
    {
      urlPreview: envDiag.urlPreview,
      anonKeyPreview: envDiag.anonKeyPreview,
    },
  );

  if (!isSupabaseConfigured()) {
    if (isVercelDeployment()) {
      logSupabase("persistEventsFullReplace: Supabase não configurado na Vercel — abortado");
      throw new Error(
        "Configure NEXT_PUBLIC_SUPABASE_URL, chave anon e SUPABASE_SERVICE_ROLE_KEY no projeto Vercel.",
      );
    }

    await writeEventsToStorage(events);
    logRepository(
      "repository em uso: JSON apenas (Supabase não configurado)",
    );
    logMigration("events escritos apenas em JSON");

    return {
      branch: "json_not_configured",
      isSupabaseConfigured: false,
      supabaseClientCreated: false,
      keyMode: "none",
      repositoryLabel: "json_only",
      upsertAttempted: false,
      upsertRowCount: events.length,
      jsonWritten: true,
      usedFallbackJson: false,
    };
  }

  const keyMode = getSupabaseServerKeyMode();
  const sr = createServiceRoleSupabaseResult();

  logSupabase(`createServiceRoleSupabase keyMode=${keyMode} clienteCriado=${sr.ok}`);

  if (!sr.ok) {
    if (shouldPersistLegacyJsonFiles()) {
      await writeEventsToStorage(events);
      logRepository(
        `repository em uso: JSON (service role inválida: ${sr.reason})`,
      );
      logMigration("events escritos em JSON (sem cliente Supabase válido)");

      return {
        branch: "json_no_client",
        isSupabaseConfigured: true,
        supabaseClientCreated: false,
        keyMode,
        repositoryLabel: "json_only_no_client",
        upsertAttempted: false,
        upsertRowCount: events.length,
        jsonWritten: true,
        usedFallbackJson: false,
      };
    }

    logSupabase(
      "persistEventsFullReplace: service role rejeitada e JSON desativado — verifique chaves no servidor",
      sr.reason,
    );
    throw new Error(sr.reason);
  }

  const syncResult = await syncEventsToSupabase(sr.client, events);

  if (!syncResult.ok) {
    const stack =
      syncResult.error instanceof Error
        ? syncResult.error.stack
        : undefined;

    logFallback("events persist: Supabase falhou", {
      phase: syncResult.phase,
      error: syncResult.error,
      serialized: serializeSupabaseError(syncResult.error),
      payload: syncResult.rows,
      stack,
      jsonFallbackAllowed: shouldPersistLegacyJsonFiles(),
    });
    logMigration("events falha ao escrever no Supabase", syncResult.error);

    if (shouldPersistLegacyJsonFiles()) {
      await writeEventsToStorage(events);
      return {
        branch: "supabase_failed_json_fallback",
        isSupabaseConfigured: true,
        supabaseClientCreated: true,
        keyMode,
        repositoryLabel: "supabase_then_json_fallback",
        upsertAttempted: syncResult.phase === "upsert",
        upsertRowCount: events.length,
        upsertPayload: syncResult.rows,
        supabaseError: serializeSupabaseError(syncResult.error),
        syncFailedPhase: syncResult.phase,
        jsonWritten: true,
        usedFallbackJson: true,
        errorStack: stack,
      };
    }

    const ser = serializeSupabaseError(syncResult.error);
    const detail = formatSupabaseErrorForThrow(ser);

    throw new Error(
      `Falha ao persistir eventos no Supabase (fase=${syncResult.phase}). ${detail}. Se vir RLS ou permission denied, confirme que SUPABASE_SERVICE_ROLE_KEY é a secret service_role (não a anon) no painel do Supabase e na Vercel.`,
    );
  }

  logRepository(`events persistidos no Supabase: ${events.length}`, {
    upsertData: syncResult.upsertData,
    payloadSummary: { rowCount: syncResult.rows.length },
  });

  if (shouldDualWriteLegacyJson() && shouldPersistLegacyJsonFiles()) {
    await writeEventsToStorage(events);
    logMigration("events dual-write JSON espelho concluído");

    return {
      branch: "supabase_success_dual_json",
      isSupabaseConfigured: true,
      supabaseClientCreated: true,
      keyMode,
      repositoryLabel: "supabase_plus_dual_json",
      upsertAttempted: true,
      upsertRowCount: events.length,
      upsertPayload: syncResult.rows,
      supabaseUpsertData: syncResult.upsertData,
      jsonWritten: true,
      usedFallbackJson: false,
    };
  }

  if (shouldDualWriteLegacyJson() && !shouldPersistLegacyJsonFiles()) {
    logRepository(
      "[LEGACY_JSON] dual-write pedido por env mas desativado neste host (ex.: Vercel)",
    );
  }

  return {
    branch: "supabase_success",
    isSupabaseConfigured: true,
    supabaseClientCreated: true,
    keyMode,
    repositoryLabel: "supabase_only",
    upsertAttempted: true,
    upsertRowCount: events.length,
    upsertPayload: syncResult.rows,
    supabaseUpsertData: syncResult.upsertData,
    jsonWritten: false,
    usedFallbackJson: false,
  };
}
