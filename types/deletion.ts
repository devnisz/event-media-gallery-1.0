/** Relatório retornado após exclusão em cascata de um evento. */
export type EventDeletionReport = {
  eventId: string;
  eventName: string;
  eventSlug: string;
  durationMs: number;
  videosRemoved: number;
  localVideoFilesRemoved: number;
  localThumbnailsRemoved: number;
  localQrCodesRemoved: number;
  r2ObjectsRemoved: number;
  r2Errors: string[];
  logs: string[];
};
