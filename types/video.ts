/**
 * Compatibilidade: a galeria passou a ser orientada a mídia (`types/media`).
 * Mantemos estes aliases para não quebrar imports existentes.
 */
import type { GalleryEventRecord } from "./event";

export type {
  EventMedia,
  GalleryMediaRecord,
  MediaKind,
} from "./media";

export type { GalleryMediaRecord as GalleryVideoRecord } from "./media";
export type { EventMedia as EventVideo } from "./media";

export type EventWithDerived = GalleryEventRecord & {
  displayCover: string | null;
};
