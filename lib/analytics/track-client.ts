import { getOrCreateVisitorKey } from "@/lib/likes/visitor-client";

async function postAnalytics(
  url: string,
  init?: RequestInit,
): Promise<void> {
  const response = await fetch(url, init);

  if (!response.ok) {
    let detail = "";

    try {
      const body = (await response.json()) as { error?: string };
      detail = body.error?.trim() ?? "";
    } catch {
      detail = "";
    }

    throw new Error(
      detail || `Falha ao registrar métrica (${response.status}).`,
    );
  }
}

function fireAndForget(promise: Promise<unknown>) {
  void promise.catch((error) => {
    console.warn("[analytics] falha ao registrar", error);
  });
}

export function trackEventGalleryView(eventSlug: string) {
  const visitorKey = getOrCreateVisitorKey();

  fireAndForget(
    postAnalytics(`/api/events/by-slug/${encodeURIComponent(eventSlug)}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorKey }),
    }),
  );
}

export function trackMediaView(mediaId: string) {
  const visitorKey = getOrCreateVisitorKey();

  fireAndForget(
    postAnalytics(`/api/media/${encodeURIComponent(mediaId)}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorKey }),
    }),
  );
}

export function trackMediaDownload(mediaId: string) {
  fireAndForget(
    postAnalytics(`/api/media/${encodeURIComponent(mediaId)}/track-download`, {
      method: "POST",
    }),
  );
}

export function trackMediaShare(mediaId: string) {
  fireAndForget(
    postAnalytics(`/api/media/${encodeURIComponent(mediaId)}/track-share`, {
      method: "POST",
    }),
  );
}
