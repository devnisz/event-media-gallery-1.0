"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import { GalleryCompactHeader } from "@/components/public/gallery-compact-header";
import { PocketBoothLauncher } from "@/components/public/pocket-booth";
import { tryRealtimeRowToEventMedia } from "@/lib/media/galleryMapping";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { EventVideo } from "@/types/video";
import { GuestUploadButton } from "./guest-upload-button";
import { VideoCard } from "./video-card";

type VideoGalleryProps = {
  initialVideos: EventVideo[];
  eventSlug: string;
  eventName: string;
  eventId?: string;
  allowPublicDelete: boolean;
  requireDeletePin: boolean;
  allowGuestUpload: boolean;
  frameUrl?: string;
};

const NEW_MEDIA_GLOW_MS = 8000;

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

function realtimeRowIsPubliclyVisible(row: Record<string, unknown>): boolean {
  return (
    row.review_status === "approved" &&
    row.is_hidden !== true &&
    typeof row.deleted_at !== "string"
  );
}

function markMediaAsNew(
  setNewMediaIds: Dispatch<SetStateAction<Set<string>>>,
  mediaId: string,
) {
  setNewMediaIds((current) => new Set(current).add(mediaId));

  window.setTimeout(() => {
    setNewMediaIds((current) => {
      const next = new Set(current);
      next.delete(mediaId);
      return next;
    });
  }, NEW_MEDIA_GLOW_MS);
}

function addOrUpdateRealtimeMedia(
  setVideos: Dispatch<SetStateAction<EventVideo[]>>,
  media: EventVideo,
  setNewMediaIds: Dispatch<SetStateAction<Set<string>>>,
) {
  setVideos((prev) => {
    const index = prev.findIndex((v) => v.id === media.id);

    if (index === -1) {
      markMediaAsNew(setNewMediaIds, media.id);
      return [media, ...prev];
    }

    const next = [...prev];
    next[index] = { ...next[index], ...media };

    return next;
  });
}

export function VideoGallery({
  initialVideos,
  eventSlug,
  eventName,
  eventId,
  allowPublicDelete,
  requireDeletePin,
  allowGuestUpload,
  frameUrl = "",
}: VideoGalleryProps) {
  const [videos, setVideos] = useState(initialVideos);
  const [newMediaIds, setNewMediaIds] = useState<Set<string>>(new Set());
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [mobileTwoCols, setMobileTwoCols] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    try {
      return window.localStorage.getItem("gallery-mobile-two-cols") === "1";
    } catch {
      return false;
    }
  });

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
          const { eventSlug: es, eventId: eid, eventName: en } = ctxRef.current;
          const row = payload.new as Record<string, unknown>;

          if (!realtimeRowMatchesEvent(row, es, eid)) {
            return;
          }

          if (!realtimeRowIsPubliclyVisible(row)) {
            return;
          }

          const normalized = normalizeRealtimeInsert(payload.new);
          const media = tryRealtimeRowToEventMedia(normalized, en, 0);

          if (!media) {
            return;
          }

          addOrUpdateRealtimeMedia(setVideos, media, setNewMediaIds);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "media",
        },
        (payload) => {
          const { eventSlug: es, eventId: eid, eventName: en } = ctxRef.current;
          const row = payload.new as Record<string, unknown>;

          if (!realtimeRowMatchesEvent(row, es, eid)) {
            return;
          }

          if (!realtimeRowIsPubliclyVisible(row)) {
            const id = normalizedString(row.id);

            if (id) {
              setVideos((prev) => prev.filter((v) => v.id !== id));
            }
            return;
          }

          const normalized = normalizeRealtimeInsert(payload.new);
          const media = tryRealtimeRowToEventMedia(normalized, en, 0);

          if (!media) {
            return;
          }

          addOrUpdateRealtimeMedia(setVideos, media, setNewMediaIds);
        },
      )
      .subscribe();

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

  const guestUploadSlot =
    allowGuestUpload && eventId ? (
      <GuestUploadButton eventId={eventId} compact />
    ) : null;

  return (
    <section className="mx-auto flex w-full max-w-[1900px] flex-col">
      <GalleryCompactHeader
        eventName={eventName}
        mediaCount={visibleVideoCount}
        guestUploadSlot={guestUploadSlot}
      />

      <div className="px-5 pb-8 pt-4 sm:px-8 lg:px-12 2xl:px-20">
        {videos.length > 0 ? (
          <div
            className={`flex flex-col ${mobileTwoCols ? "gap-2 md:gap-4" : "gap-3 md:gap-4"}`}
          >
            <div className="flex flex-wrap items-center justify-end gap-3 md:hidden">
              <div
                className="inline-flex rounded-full border border-white/10 bg-black/30 p-0.5"
                role="group"
                aria-label="Número de colunas no celular"
              >
                <button
                  type="button"
                  aria-pressed={!mobileTwoCols}
                  onClick={() => setMobileTwoCols(false)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    !mobileTwoCols
                      ? "bg-white text-slate-950 shadow"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  1 col
                </button>
                <button
                  type="button"
                  aria-pressed={mobileTwoCols}
                  onClick={() => setMobileTwoCols(true)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    mobileTwoCols
                      ? "bg-white text-slate-950 shadow"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  2 cols
                </button>
              </div>
            </div>

            <div
              className={`grid min-w-0 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${
                mobileTwoCols
                  ? "grid-cols-2 gap-2 md:gap-5"
                  : "grid-cols-2 gap-3 sm:gap-4 md:gap-5"
              }`}
            >
              {videos.map((video, index) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  index={index}
                  isNew={newMediaIds.has(video.id)}
                  isRemoving={removingIds.has(video.id)}
                  onDeleted={handleDeleted}
                  compactMobileTwoCol={mobileTwoCols}
                  allowPublicDelete={allowPublicDelete}
                  requireDeletePin={requireDeletePin}
                  hideEventLabel
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-md py-16 text-center">
            <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]">
              <span className="size-2 rounded-full bg-emerald-400 animate-live-pulse" />
            </div>
            <h2 className="text-xl font-black text-white">Galeria ao vivo</h2>
            <p className="mt-2 text-sm leading-6 text-white/45">
              As mídias aparecem aqui assim que forem enviadas. Fique nesta
              página — tudo chega em tempo real.
            </p>
          </div>
        )}
      </div>

      <PocketBoothLauncher
        eventId={eventId}
        allowGuestUpload={allowGuestUpload}
        frameUrl={frameUrl}
      />
    </section>
  );
}
