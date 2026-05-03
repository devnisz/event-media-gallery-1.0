/**
 * Fachada estável para o app: UI e API importam daqui para desacoplar de
 * `services/*` quando houver adapters (ex. Supabase / cliente Electron).
 */
export type {
  EventMedia,
  EventVideo,
  GalleryMediaRecord,
  GalleryMediaRecord as GalleryVideo,
  GalleryVideoRecord,
  MediaKind,
} from "@/types/video";

export {
  deleteGalleryMedia,
  deleteGalleryVideo,
  getEventVideos,
  getEventVideosForEventSlug,
  getGalleryVideos,
  getMediaById,
  getVideoById,
  getVideoBySlug,
  readGalleryMediaRaw,
  reconcileAllEventCounts,
  replaceGalleryMediaRecordsOnDisk,
  sortGalleryMediaRecords,
} from "@/services/mediaService";
