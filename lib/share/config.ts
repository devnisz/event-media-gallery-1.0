import type { GalleryEventRecord, StoredEventLoose } from "@/types/event";

export type MediaShareEventConfig = {
  enabled: boolean;
};

/** Padrão: ativado quando a coluna ainda não existe (legado). */
export function resolveMediaShareConfig(
  source: Pick<GalleryEventRecord, "allowMediaShare"> | StoredEventLoose,
): MediaShareEventConfig {
  return {
    enabled: source.allowMediaShare !== false,
  };
}
