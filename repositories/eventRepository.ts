/**
 * Persistência de eventos: Supabase quando configurado, com fallback JSON.
 */
import type { GalleryEventRecord, StoredEventLoose } from "@/types/event";
import {
  createServerSupabase,
  getSupabaseServerKeyMode,
} from "@/lib/supabase/server";
import {
  getSupabaseEnvDiagnostics,
  isSupabaseConfigured,
  logFallback,
  logMigration,
  logRepository,
  logSupabase,
  logSupabaseEnvCheck,
  shouldDualWriteLegacyJson,
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

function rowToLoose(row: EventRow): StoredEventLoose {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at,
    uploadToken: row.upload_token,
    coverImage: row.cover_image ?? "",
    videosCount: row.videos_count ?? 0,
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

  const client = createServerSupabase();

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
    `persistEventsFullReplace start isSupabaseConfigured=${isSupabaseConfigured()} hasUrl=${envDiag.hasUrl} hasAnonKey=${envDiag.hasAnonKey} hasServiceRole=${envDiag.hasServiceRole}`,
    {
      urlPreview: envDiag.urlPreview,
      anonKeyPreview: envDiag.anonKeyPreview,
    },
  );

  if (!isSupabaseConfigured()) {
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
  const client = createServerSupabase();

  logSupabase(`createServerSupabase efetivo keyMode=${keyMode} clienteCriado=${Boolean(client)}`);

  if (!client) {
    await writeEventsToStorage(events);
    logRepository("repository em uso: JSON (cliente Supabase nulo)");
    logMigration("events escritos em JSON (sem cliente Supabase)");

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

  const syncResult = await syncEventsToSupabase(client, events);

  if (!syncResult.ok) {
    const stack =
      syncResult.error instanceof Error
        ? syncResult.error.stack
        : undefined;

    logFallback("events persist: Supabase falhou → JSON", {
      phase: syncResult.phase,
      error: syncResult.error,
      serialized: serializeSupabaseError(syncResult.error),
      payload: syncResult.rows,
      stack,
    });
    logMigration("events falha ao escrever no Supabase → JSON", syncResult.error);
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

  logRepository(`events persistidos no Supabase: ${events.length}`, {
    upsertData: syncResult.upsertData,
    payloadSummary: { rowCount: syncResult.rows.length },
  });

  if (shouldDualWriteLegacyJson()) {
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
