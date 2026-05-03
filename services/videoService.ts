/**
 * Facade histórico: a implementação vive em `mediaService.ts` (galeria unificada).
 * Novos códigos podem importar `@/services/mediaService` diretamente.
 */
export {
  buildPublicPageUrl,
  deleteGalleryMedia,
  deleteGalleryVideo,
  enrichEventsWithCovers,
  getEventVideos,
  getEventVideosForEventSlug,
  getGalleryVideos,
  getMediaById,
  getPrimaryMediaUrl,
  getVideoById,
  getVideoBySlug,
  loadGalleryVideosForMutation,
  readGalleryMediaRaw,
  readGalleryVideosRaw,
  reconcileAllEventCounts,
  replaceGalleryMediaRecordsOnDisk,
  sortGalleryMediaRecords,
  unlinkGalleryPublicAsset,
  type UnlinkGalleryAssetResult,
} from "./mediaService";
