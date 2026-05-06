"use client";

import { useEffect, useMemo, useState } from "react";

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

function realtimeRowMatchesEvent(
  row: Record<string, unknown>,
  slug: string,
  resolvedEventId?: string,
): boolean {
  const targetSlug = slug.trim().toLowerCase();
  const rowSlug =
    typeof row.event_slug === "string"
      ? row.event_slug.trim().toLowerCase()
      : "";

  if (rowSlug.length > 0 && rowSlug === targetSlug) {
    return true;
  }

  const targetId = resolvedEventId?.trim().toLowerCase();
  if (!targetId) {
    return false;
  }

  const rowEventId =
    typeof row.event_id === "string"
      ? row.event_id.trim().toLowerCase()
      : "";

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

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[gallery] env público Supabase:", {
        hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
        hasAnon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()),
      });
    }
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[gallery] realtime: inicializando subscription");
    }

    const supabase = createBrowserSupabase();

    if (!supabase) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[gallery] realtime indisponível: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY ausentes",
        );
      }
      return;
    }

    const channel = supabase
      .channel("media_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "media",
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;

          if (!realtimeRowMatchesEvent(row, eventSlug, eventId)) {
            return;
          }

          if (process.env.NODE_ENV === "development") {
            console.log("[gallery] insert em media (evento atual)");
          }

          const media = tryRealtimeRowToEventMedia(
            payload.new,
            eventName,
            0,
          );

          if (!media) {
            return;
          }

          setVideos((prev) => {
            if (prev.some((v) => v.id === media.id)) {
              return prev;
            }
            return [media, ...prev];
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [eventId, eventName, eventSlug]);

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
        <div className="grid gap-6">
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
      ) : (
        <div className="p-10 text-center">
          <h2>Nenhuma mídia disponível.</h2>
        </div>
      )}
    </section>
  );
}
