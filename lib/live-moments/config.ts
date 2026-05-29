import type { GalleryEventRecord, StoredEventLoose } from "@/types/event";

export type LiveMomentsSortOrder = "newest-first" | "oldest-first";

/** Ordem padrão: mais recente primeiro (sensação “ao vivo”). */
export const LIVE_MOMENTS_DEFAULT_SORT_ORDER: LiveMomentsSortOrder =
  "newest-first";

export type LiveMomentsEventConfig = {
  enabled: boolean;
  sortOrder: LiveMomentsSortOrder;
};

export function resolveLiveMomentsConfig(
  source: Pick<GalleryEventRecord, "liveMomentsEnabled"> | StoredEventLoose,
): LiveMomentsEventConfig {
  return {
    enabled: source.liveMomentsEnabled === true,
    sortOrder: LIVE_MOMENTS_DEFAULT_SORT_ORDER,
  };
}
