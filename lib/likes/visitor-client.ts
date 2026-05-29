"use client";

import { LIKED_MEDIA_STORAGE_KEY, normalizeVisitorKey } from "@/lib/likes/visitor";

const VISITOR_ID_KEY = "midiaup_visitor_id";

function readLikedSet(): Set<string> {
  if (typeof window === "undefined") {
    return new Set();
  }

  try {
    const raw = window.localStorage.getItem(LIKED_MEDIA_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];

    if (!Array.isArray(parsed)) {
      return new Set();
    }

    return new Set(parsed.filter((id) => typeof id === "string" && id.trim()));
  } catch {
    return new Set();
  }
}

function writeLikedSet(ids: Set<string>) {
  window.localStorage.setItem(
    LIKED_MEDIA_STORAGE_KEY,
    JSON.stringify([...ids]),
  );
}

export function getOrCreateVisitorKey(): string {
  const existing = window.localStorage.getItem(VISITOR_ID_KEY)?.trim();

  if (existing && normalizeVisitorKey(existing)) {
    return existing;
  }

  const created = crypto.randomUUID();
  window.localStorage.setItem(VISITOR_ID_KEY, created);

  return created;
}

export function isMediaLikedLocally(mediaId: string): boolean {
  return readLikedSet().has(mediaId);
}

export function setMediaLikedLocally(mediaId: string, liked: boolean) {
  const set = readLikedSet();

  if (liked) {
    set.add(mediaId);
  } else {
    set.delete(mediaId);
  }

  writeLikedSet(set);
}
