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
  getDashboardMediaForEvent,
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
  softDeleteGalleryMedia,
  sortGalleryMediaRecords,
  unlinkGalleryPublicAsset,
  updateGalleryMediaState,
  type UnlinkGalleryAssetResult,
} from "./mediaService";
