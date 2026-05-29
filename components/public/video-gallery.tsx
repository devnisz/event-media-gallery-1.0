"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import { GalleryEmptyState } from "@/components/public/gallery/gallery-empty-state";
import { PremiumGalleryGrid } from "@/components/public/gallery/premium-gallery-grid";
import { SocialGalleryGrid } from "@/components/public/gallery/social-gallery-grid";
import { GalleryCompactHeader } from "@/components/public/gallery-compact-header";
import { LiveMomentsEntry } from "@/components/public/live-moments";
import { VirtualBoothLauncher } from "@/components/public/virtual-booth";
import {
  DEFAULT_GALLERY_LAYOUT,
  isSocialGalleryLayout,
  type GalleryLayout,
} from "@/lib/gallery/layout";
import type { CabineVirtualEventConfig } from "@/lib/virtual-booth/event-config";
import { tryRealtimeRowToEventMedia } from "@/lib/media/galleryMapping";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { EventVideo } from "@/types/video";
import { GuestUploadButton } from "./guest-upload-button";

type VideoGalleryProps = {
  initialVideos: EventVideo[];
  eventSlug: string;
  eventName: string;
  eventId?: string;
  allowPublicDelete: boolean;
  requireDeletePin: boolean;
  allowGuestUpload: boolean;
  frameUrl?: string;
  galleryLayout?: GalleryLayout;
  cabineConfig: CabineVirtualEventConfig;
  liveMomentsEnabled: boolean;
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
  galleryLayout = DEFAULT_GALLERY_LAYOUT,
  cabineConfig,
  liveMomentsEnabled,
}: VideoGalleryProps) {
  const isSocialLayout = isSocialGalleryLayout(galleryLayout);
  const [videos, setVideos] = useState(initialVideos);
  const [newMediaIds, setNewMediaIds] = useState<Set<string>>(new Set());
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

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

  const gridSharedProps = {
    videos,
    newMediaIds,
    removingIds,
    allowPublicDelete,
    requireDeletePin,
    onDeleted: handleDeleted,
  };

  return (
    <section className="mx-auto flex w-full max-w-[1900px] flex-col">
      <GalleryCompactHeader
        eventName={eventName}
        mediaCount={visibleVideoCount}
        guestUploadSlot={guestUploadSlot}
        compact={isSocialLayout}
      />

      <div
        className={
          isSocialLayout
            ? "px-0 pb-4 pt-1 sm:px-0.5"
            : "px-5 pb-8 pt-4 sm:px-8 lg:px-12 2xl:px-20"
        }
      >
        {liveMomentsEnabled ? <LiveMomentsEntry media={videos} /> : null}

        {videos.length > 0 ? (
          isSocialLayout ? (
            <SocialGalleryGrid {...gridSharedProps} />
          ) : (
            <PremiumGalleryGrid {...gridSharedProps} />
          )
        ) : (
          <GalleryEmptyState />
        )}
      </div>

      <VirtualBoothLauncher
        eventId={eventId}
        allowGuestUpload={allowGuestUpload}
        frameUrl={frameUrl}
        cabineConfig={cabineConfig}
      />
    </section>
  );
}
