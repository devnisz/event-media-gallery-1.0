import { createServiceRoleSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type ToggleMediaLikeResult = {
  liked: boolean;
  likesCount: number;
};

export async function isSupabaseMediaLikesAvailable(): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  return Boolean(createServiceRoleSupabase());
}

export async function toggleMediaLikeOnSupabase(
  mediaId: string,
  visitorKey: string,
): Promise<ToggleMediaLikeResult> {
  const client = createServiceRoleSupabase();

  if (!client) {
    throw new Error("Supabase não configurado para curtidas.");
  }

  const { data: existing, error: selectErr } = await client
    .from("media_likes")
    .select("media_id")
    .eq("media_id", mediaId)
    .eq("visitor_key", visitorKey)
    .maybeSingle();

  if (selectErr) {
    throw new Error(selectErr.message);
  }

  const { data: mediaRow, error: mediaErr } = await client
    .from("media")
    .select("likes_count")
    .eq("id", mediaId)
    .maybeSingle();

  if (mediaErr) {
    throw new Error(mediaErr.message);
  }

  if (!mediaRow) {
    throw new Error("Mídia não encontrada.");
  }

  const currentCount = Math.max(
    0,
    typeof mediaRow.likes_count === "number" ? mediaRow.likes_count : 0,
  );

  if (existing) {
    const { error: delErr } = await client
      .from("media_likes")
      .delete()
      .eq("media_id", mediaId)
      .eq("visitor_key", visitorKey);

    if (delErr) {
      throw new Error(delErr.message);
    }

    const nextCount = Math.max(0, currentCount - 1);
    const { error: upErr } = await client
      .from("media")
      .update({ likes_count: nextCount })
      .eq("id", mediaId);

    if (upErr) {
      throw new Error(upErr.message);
    }

    return { liked: false, likesCount: nextCount };
  }

  const { error: insErr } = await client.from("media_likes").insert({
    media_id: mediaId,
    visitor_key: visitorKey,
  });

  if (insErr) {
    throw new Error(insErr.message);
  }

  const nextCount = currentCount + 1;
  const { error: upErr } = await client
    .from("media")
    .update({ likes_count: nextCount })
    .eq("id", mediaId);

  if (upErr) {
    throw new Error(upErr.message);
  }

  return { liked: true, likesCount: nextCount };
}
