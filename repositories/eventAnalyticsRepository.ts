import { VIEW_DEDUP_WINDOW_MS } from "@/lib/analytics/constants";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServiceRoleSupabase } from "@/lib/supabase/server";

export async function isSupabaseEventAnalyticsAvailable(): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  return Boolean(createServiceRoleSupabase());
}

function viewWindowIso(): string {
  return new Date(Date.now() - VIEW_DEDUP_WINDOW_MS).toISOString();
}

export type CountResult = {
  counted: boolean;
  viewCount?: number;
  downloadCount?: number;
  shareCount?: number;
};

export async function recordEventGalleryViewOnSupabase(
  eventId: string,
  visitorKey: string,
): Promise<CountResult> {
  const client = createServiceRoleSupabase();

  if (!client) {
    throw new Error("Supabase não configurado para métricas.");
  }

  const windowStart = viewWindowIso();

  const { data: recent, error: recentErr } = await client
    .from("event_gallery_view_sessions")
    .select("last_viewed_at")
    .eq("event_id", eventId)
    .eq("visitor_key", visitorKey)
    .gte("last_viewed_at", windowStart)
    .maybeSingle();

  if (recentErr) {
    throw new Error(recentErr.message);
  }

  const nowIso = new Date().toISOString();

  const { error: upsertErr } = await client.from("event_gallery_view_sessions").upsert(
    {
      event_id: eventId,
      visitor_key: visitorKey,
      last_viewed_at: nowIso,
    },
    { onConflict: "event_id,visitor_key" },
  );

  if (upsertErr) {
    throw new Error(upsertErr.message);
  }

  if (recent) {
    return { counted: false };
  }

  const { data: eventRow, error: eventErr } = await client
    .from("events")
    .select("view_count")
    .eq("id", eventId)
    .maybeSingle();

  if (eventErr) {
    throw new Error(eventErr.message);
  }

  if (!eventRow) {
    throw new Error("Evento não encontrado.");
  }

  const current = Math.max(
    0,
    typeof eventRow.view_count === "number" ? eventRow.view_count : 0,
  );
  const nextCount = current + 1;

  const { error: upErr } = await client
    .from("events")
    .update({ view_count: nextCount })
    .eq("id", eventId);

  if (upErr) {
    throw new Error(upErr.message);
  }

  return { counted: true, viewCount: nextCount };
}

export async function recordMediaViewOnSupabase(
  mediaId: string,
  visitorKey: string,
): Promise<CountResult & { eventId?: string }> {
  const client = createServiceRoleSupabase();

  if (!client) {
    throw new Error("Supabase não configurado para métricas.");
  }

  const { data: mediaRow, error: mediaErr } = await client
    .from("media")
    .select("event_id, view_count")
    .eq("id", mediaId)
    .maybeSingle();

  if (mediaErr) {
    throw new Error(mediaErr.message);
  }

  if (!mediaRow) {
    throw new Error("Mídia não encontrada.");
  }

  const eventId =
    typeof mediaRow.event_id === "string" ? mediaRow.event_id.trim() : "";

  const windowStart = viewWindowIso();

  const { data: recent, error: recentErr } = await client
    .from("media_view_sessions")
    .select("last_viewed_at")
    .eq("media_id", mediaId)
    .eq("visitor_key", visitorKey)
    .gte("last_viewed_at", windowStart)
    .maybeSingle();

  if (recentErr) {
    throw new Error(recentErr.message);
  }

  const nowIso = new Date().toISOString();

  const { error: upsertErr } = await client.from("media_view_sessions").upsert(
    {
      media_id: mediaId,
      visitor_key: visitorKey,
      last_viewed_at: nowIso,
    },
    { onConflict: "media_id,visitor_key" },
  );

  if (upsertErr) {
    throw new Error(upsertErr.message);
  }

  if (recent) {
    return { counted: false, eventId };
  }

  const currentMediaViews = Math.max(
    0,
    typeof mediaRow.view_count === "number" ? mediaRow.view_count : 0,
  );
  const nextMediaViews = currentMediaViews + 1;

  const { error: mediaUpErr } = await client
    .from("media")
    .update({ view_count: nextMediaViews })
    .eq("id", mediaId);

  if (mediaUpErr) {
    throw new Error(mediaUpErr.message);
  }

  return {
    counted: true,
    viewCount: nextMediaViews,
    eventId,
  };
}

export async function incrementMediaDownloadOnSupabase(
  mediaId: string,
): Promise<CountResult & { eventId?: string; eventDownloadCount?: number }> {
  const client = createServiceRoleSupabase();

  if (!client) {
    throw new Error("Supabase não configurado para métricas.");
  }

  const { data: mediaRow, error: mediaErr } = await client
    .from("media")
    .select("event_id, download_count")
    .eq("id", mediaId)
    .maybeSingle();

  if (mediaErr) {
    throw new Error(mediaErr.message);
  }

  if (!mediaRow) {
    throw new Error("Mídia não encontrada.");
  }

  const eventId =
    typeof mediaRow.event_id === "string" ? mediaRow.event_id.trim() : "";
  const nextMediaDownloads =
    Math.max(0, typeof mediaRow.download_count === "number" ? mediaRow.download_count : 0) +
    1;

  const { error: mediaUpErr } = await client
    .from("media")
    .update({ download_count: nextMediaDownloads })
    .eq("id", mediaId);

  if (mediaUpErr) {
    throw new Error(mediaUpErr.message);
  }

  let eventDownloadCount: number | undefined;

  if (eventId) {
    const { data: eventRow, error: eventErr } = await client
      .from("events")
      .select("download_count")
      .eq("id", eventId)
      .maybeSingle();

    if (eventErr) {
      throw new Error(eventErr.message);
    }

    if (eventRow) {
      eventDownloadCount =
        Math.max(
          0,
          typeof eventRow.download_count === "number" ? eventRow.download_count : 0,
        ) + 1;

      const { error: eventUpErr } = await client
        .from("events")
        .update({ download_count: eventDownloadCount })
        .eq("id", eventId);

      if (eventUpErr) {
        throw new Error(eventUpErr.message);
      }
    }
  }

  return {
    counted: true,
    downloadCount: nextMediaDownloads,
    eventId,
    eventDownloadCount,
  };
}

export async function incrementMediaShareOnSupabase(
  mediaId: string,
): Promise<CountResult & { eventId?: string; eventShareCount?: number }> {
  const client = createServiceRoleSupabase();

  if (!client) {
    throw new Error("Supabase não configurado para métricas.");
  }

  const { data: mediaRow, error: mediaErr } = await client
    .from("media")
    .select("event_id, share_count")
    .eq("id", mediaId)
    .maybeSingle();

  if (mediaErr) {
    throw new Error(mediaErr.message);
  }

  if (!mediaRow) {
    throw new Error("Mídia não encontrada.");
  }

  const eventId =
    typeof mediaRow.event_id === "string" ? mediaRow.event_id.trim() : "";
  const nextMediaShares =
    Math.max(0, typeof mediaRow.share_count === "number" ? mediaRow.share_count : 0) +
    1;

  const { error: mediaUpErr } = await client
    .from("media")
    .update({ share_count: nextMediaShares })
    .eq("id", mediaId);

  if (mediaUpErr) {
    throw new Error(mediaUpErr.message);
  }

  let eventShareCount: number | undefined;

  if (eventId) {
    const { data: eventRow, error: eventErr } = await client
      .from("events")
      .select("share_count")
      .eq("id", eventId)
      .maybeSingle();

    if (eventErr) {
      throw new Error(eventErr.message);
    }

    if (eventRow) {
      eventShareCount =
        Math.max(
          0,
          typeof eventRow.share_count === "number" ? eventRow.share_count : 0,
        ) + 1;

      const { error: eventUpErr } = await client
        .from("events")
        .update({ share_count: eventShareCount })
        .eq("id", eventId);

      if (eventUpErr) {
        throw new Error(eventUpErr.message);
      }
    }
  }

  return {
    counted: true,
    shareCount: nextMediaShares,
    eventId,
    eventShareCount,
  };
}
