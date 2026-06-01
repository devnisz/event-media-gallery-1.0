"use client";

import { useEffect, useRef } from "react";

import { trackEventGalleryView } from "@/lib/analytics/track-client";

type EventGalleryViewTrackerProps = {
  eventSlug: string;
};

export function EventGalleryViewTracker({ eventSlug }: EventGalleryViewTrackerProps) {
  const trackedRef = useRef(false);

  useEffect(() => {
    const slug = eventSlug.trim();

    if (!slug || trackedRef.current) {
      return;
    }

    trackedRef.current = true;
    trackEventGalleryView(slug);
  }, [eventSlug]);

  return null;
}
