import {
  getOrCreateVisitorKey,
  setMediaLikedLocally,
} from "@/lib/likes/visitor-client";

export type ToggleMediaLikeClientResult = {
  liked: boolean;
  likesCount: number;
};

export async function toggleMediaLikeClient(
  mediaId: string,
): Promise<ToggleMediaLikeClientResult> {
  const visitorKey = getOrCreateVisitorKey();
  const response = await fetch(
    `/api/media/${encodeURIComponent(mediaId)}/like`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorKey }),
    },
  );
  const payload = (await response.json()) as {
    error?: string;
    liked?: boolean;
    likesCount?: number;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Não foi possível curtir.");
  }

  const liked = payload.liked === true;
  const likesCount =
    typeof payload.likesCount === "number"
      ? Math.max(0, payload.likesCount)
      : 0;

  setMediaLikedLocally(mediaId, liked);

  return { liked, likesCount };
}
