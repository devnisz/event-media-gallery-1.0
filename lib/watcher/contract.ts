/**
 * Contrato de integração do watcher (video-uploader) com a galeria.
 *
 * O watcher continua aceitando JSON local manual; estes contratos descrevem
 * tambem o fluxo autenticado usado pelo CLI de conexao.
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

export type WatcherSessionPayload = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
  tokenType: string;
};

export type WatcherEventOption = {
  id: string;
  name: string;
  slug: string;
  uploadToken: string;
  videosCount?: number;
};

export type WatcherCreateEventPayload = {
  name: string;
};

export type WatcherCreateEventResponse = {
  success: true;
  event: WatcherEventOption;
};
