import { getOrCreateVisitorKey } from "@/lib/likes/visitor-client";

function fireAndForget(promise: Promise<unknown>) {
  void promise.catch((error) => {
    console.warn("[analytics] falha ao registrar", error);
  });
}

export function trackEventGalleryView(eventSlug: string) {
  const visitorKey = getOrCreateVisitorKey();

  fireAndForget(
    fetch(`/api/events/by-slug/${encodeURIComponent(eventSlug)}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorKey }),
    }),
  );
}

export function trackMediaView(mediaId: string) {
  const visitorKey = getOrCreateVisitorKey();

  fireAndForget(
    fetch(`/api/media/${encodeURIComponent(mediaId)}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorKey }),
    }),
  );
}

export function trackMediaDownload(mediaId: string) {
  fireAndForget(
    fetch(`/api/media/${encodeURIComponent(mediaId)}/track-download`, {
      method: "POST",
    }),
  );
}

export function trackMediaShare(mediaId: string) {
  fireAndForget(
    fetch(`/api/media/${encodeURIComponent(mediaId)}/track-share`, {
      method: "POST",
    }),
  );
}
