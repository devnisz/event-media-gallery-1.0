/**
 * Contrato de integração do watcher (video-uploader) com a galeria.
 *
 * Nesta etapa o watcher continua em JSON local; futuramente o mesmo payload
 * pode ser validado via HTTPS ou Supabase Edge Functions.
 */

/** Binding esperado no `config.json` do watcher após integração completa. */
export type WatcherGalleryBinding = {
  /** Pasta monitorada (path absoluto ou relativo ao módulo do watcher). */
  watchFolder: string;
  /** ID do evento em `gallery/data/events.json`. */
  eventId: string;
  /** Token opaco gerado pelo admin ao criar o evento. */
  uploadToken: string;
};

/** Corpo HTTP futuro para validação remota (sem login nesta etapa). */
export type WatcherCredentialsPayload = Pick<
  WatcherGalleryBinding,
  "eventId" | "uploadToken"
>;
