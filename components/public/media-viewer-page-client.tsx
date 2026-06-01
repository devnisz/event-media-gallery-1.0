"use client";

import { useEffect, useState } from "react";

import { MediaViewerNavigator } from "@/components/public/media-viewer-navigator";
import { markMediaOpenPhase } from "@/lib/gallery/media-open-perf";
import type { EventMedia } from "@/types/media";

type MediaViewerPageClientProps = {
  video: EventMedia;
  eventHref: string;
  eventSlug: string;
  allowLikes: boolean;
  allowMediaShare: boolean;
};

export function MediaViewerPageClient({
  video,
  eventHref,
  eventSlug,
  allowLikes,
  allowMediaShare,
}: MediaViewerPageClientProps) {
  const [items, setItems] = useState<EventMedia[]>([video]);

  useEffect(() => {
    let cancelled = false;

    markMediaOpenPhase("carousel-list-fetch-start", { eventSlug });

    fetch(`/api/events/by-slug/${encodeURIComponent(eventSlug)}/gallery-media`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { items?: EventMedia[] } | null) => {
        if (cancelled || !payload?.items?.length) {
          if (!cancelled) {
            markMediaOpenPhase("carousel-list-fetch-empty", { eventSlug });
          }
          return;
        }

        setItems(payload.items);
        markMediaOpenPhase("carousel-list-fetch-done", {
          eventSlug,
          count: payload.items.length,
        });
      })
      .catch(() => {
        if (!cancelled) {
          markMediaOpenPhase("carousel-list-fetch-error", { eventSlug });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [eventSlug]);

  return (
    <MediaViewerNavigator
      items={items}
      initialMediaId={video.id}
      eventHref={eventHref}
      eventSlug={eventSlug}
      allowLikes={allowLikes}
      allowMediaShare={allowMediaShare}
    />
  );
}
