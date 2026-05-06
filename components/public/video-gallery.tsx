"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { tryRealtimeRowToEventMedia } from "@/lib/media/galleryMapping";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { EventVideo } from "@/types/video";
import { VideoCard } from "./video-card";

type VideoGalleryProps = {
  initialVideos: EventVideo[];
  eventSlug: string;
  eventName: string;
  eventId?: string;
};

/** Normaliza ID, URL (copia de aliases comuns do Supabase) para passar em isMediaLike / mapeamento. */
function normalizeRealtimeInsert(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") {
    return raw;
  }

  const o = { ...(raw as Record<string, unknown>) };

  if (typeof o.id === "number" && Number.isFinite(o.id)) {
    o.id = String(Math.trunc(o.id));
  }
  if (typeof o.id === "string") {
    o.id = o.id.trim();
  }

  const urlKeys = [
    "url",
    "video_url",
    "videoUrl",
    "public_url",
    "file_url",
    "playback_url",
    "src",
  ] as const;

  let primary = "";
  for (const k of urlKeys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) {
      primary = v.trim();
      break;
    }
  }
  if (primary && (typeof o.url !== "string" || !String(o.url).trim())) {
    o.url = primary;
  }

  return o;
}

function normalizedString(value: unknown): string {
  if (typeof value === "string") {
    return value.trim().toLowerCase();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value)).toLowerCase();
  }
  return "";
}

function realtimeRowMatchesEvent(
  row: Record<string, unknown>,
  slug: string,
  resolvedEventId?: string,
): boolean {
  const targetSlug = slug.trim().toLowerCase();
  const rowSlug = normalizedString(row.event_slug);

  if (rowSlug.length > 0 && rowSlug === targetSlug) {
    return true;
  }

  const targetId = resolvedEventId?.trim().toLowerCase();
  if (!targetId) {
    return false;
  }

  const rowEventId = normalizedString(row.event_id);

  if (rowEventId.length === 0) {
    return false;
  }
  return rowEventId === targetId;
}

export function VideoGallery({
  initialVideos,
  eventSlug,
  eventName,
  eventId,
}: VideoGalleryProps) {
  const [videos, setVideos] = useState(initialVideos);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [mobileTwoCols, setMobileTwoCols] = useState(false);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem("gallery-mobile-two-cols");
      if (v === "1") {
        setMobileTwoCols(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "gallery-mobile-two-cols",
        mobileTwoCols ? "1" : "0",
      );
    } catch {
      /* ignore */
    }
  }, [mobileTwoCols]);

  const ctxRef = useRef({ eventSlug, eventId, eventName });

  useEffect(() => {
    ctxRef.current = { eventSlug, eventId, eventName };
  }, [eventId, eventName, eventSlug]);

  useEffect(() => {
    const supabase = createBrowserSupabase();

    if (!supabase) {
      console.warn("[REALTIME] sem cliente — subscription não iniciada");
      return;
    }

    const instanceTag = `${eventSlug}:${eventId ?? ""}`;
    const channelName = `gallery_media:${instanceTag}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "media",
        },
        (payload) => {
          console.log("[REALTIME] evento recebido", payload);
          const { eventSlug: es, eventId: eid, eventName: en } = ctxRef.current;
          const row = payload.new as Record<string, unknown>;

          if (!realtimeRowMatchesEvent(row, es, eid)) {
            console.log("[REALTIME] linha ignorada (outro evento)", {
              rowSlug: row.event_slug,
              rowEventId: row.event_id,
              gallerySlug: es,
              galleryEventId: eid,
            });
            return;
          }

          const normalized = normalizeRealtimeInsert(payload.new);
          const media = tryRealtimeRowToEventMedia(normalized, en, 0);

          if (!media) {
            console.log(
              "[REALTIME] payload.new não virou EventMedia (id/url?) — após normalize",
              normalized,
            );
            return;
          }

          setVideos((prev) => {
            if (prev.some((v) => v.id === media.id)) {
              console.log("[REALTIME] duplicado ignorado", media.id);
              return prev;
            }
            console.log("[REALTIME] vídeo adicionado", media.id);
            return [media, ...prev];
          });
        },
      )
      .subscribe((status, err) => {
        console.log("[REALTIME] subscription status", status, err ?? "");
        if (status === "SUBSCRIBED") {
          console.log("[REALTIME] conectado");
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("[REALTIME] falha no canal", status, err);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [eventId, eventSlug]);

  const visibleVideoCount = useMemo(
    () => videos.length - removingIds.size,
    [removingIds.size, videos.length],
  );

  function handleDeleted(id: string) {
    setRemovingIds((current) => new Set(current).add(id));

    window.setTimeout(() => {
      setVideos((current) => current.filter((v) => v.id !== id));
      setRemovingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }, 260);
  }

  return (
    <section className="mx-auto flex w-full max-w-[1900px] flex-col gap-10">
      <header className="animate-rise flex flex-col justify-between gap-8 rounded-[2.5rem] border border-white/10 bg-white/[0.06] p-7 shadow-[0_28px_90px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-10 xl:flex-row xl:items-end">
        <div className="max-w-5xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.36em] text-amber-200">
            Sua coleção de memórias
          </p>
          <h2 className="text-4xl font-black sm:text-6xl xl:text-7xl">
            Momentos à sua escolha.
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center sm:min-w-[28rem]">
          <div className="p-5">
            <strong className="text-3xl">{visibleVideoCount}</strong>
            <span className="block text-sm text-white/50">mídias</span>
          </div>
          <div className="p-5">
            <strong className="text-3xl">4K</strong>
            <span className="block text-sm text-white/50">ready</span>
          </div>
          <div className="p-5">
            <strong className="text-3xl">43 in</strong>
            <span className="block text-sm text-white/50">touch</span>
          </div>
        </div>
      </header>

      {videos.length > 0 ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 md:hidden">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
              Vista no celular
            </span>
            <div
              className="inline-flex rounded-full border border-white/15 bg-black/30 p-1"
              role="group"
              aria-label="Número de colunas no celular"
            >
              <button
                type="button"
                aria-pressed={!mobileTwoCols}
                onClick={() => setMobileTwoCols(false)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  !mobileTwoCols
                    ? "bg-white text-slate-950 shadow"
                    : "text-white/70 hover:text-white"
                }`}
              >
                1 coluna
              </button>
              <button
                type="button"
                aria-pressed={mobileTwoCols}
                onClick={() => setMobileTwoCols(true)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  mobileTwoCols
                    ? "bg-white text-slate-950 shadow"
                    : "text-white/70 hover:text-white"
                }`}
              >
                2 colunas
              </button>
            </div>
          </div>

          <div
            className={`grid min-w-0 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${
              mobileTwoCols ? "grid-cols-2" : "grid-cols-1"
            }`}
          >
          {videos.map((video, index) => (
            <VideoCard
              key={video.id}
              video={video}
              index={index}
              isRemoving={removingIds.has(video.id)}
              onDeleted={handleDeleted}
            />
          ))}
          </div>
        </div>
      ) : (
        <div className="p-10 text-center">
          <h2>Nenhuma mídia disponível.</h2>
        </div>
      )}
    </section>
  );
}
