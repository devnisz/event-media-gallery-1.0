/**
 * Modelo unificado de mídia (JSON local ou futuro adapter Supabase).
 * Legacy: registros com `videoUrl` / `thumbnail` são normalizados na leitura.
 */

export type MediaKind = "video" | "image" | "gif" | "boomerang";
export type MediaSource = "operator" | "guest";
export type MediaReviewStatus = "approved" | "pending" | "rejected";

/** Registro já normalizado em memória após parse de `videos.json`. */
export type GalleryMediaRecord = {
  id: string;
  eventId: string;
  eventSlug: string;
  /** Espelha `events.owner_user_id` quando conhecido (ingestão / sync). */
  ownerUserId?: string;
  name: string;
  /** URL principal do arquivo (histórico: `videoUrl`). */
  url: string;
  qrCode: string;
  thumbnailUrl?: string;
  mediaType: MediaKind;
  fileType: string;
  /** Origem da midia: watcher/operador oficial ou convidado publico. */
  mediaSource: MediaSource;
  /** Estado de moderacao: apenas approved aparece publicamente. */
  reviewStatus: MediaReviewStatus;
  createdAt?: string;
  /** Data de upload alternativa (JSON / futuros adapters). */
  uploadedAt?: string;
  /** Instantâneo numérico ou ISO normalizado na leitura. */
  timestamp?: string;
  /** Não aparece na galeria pública, mas segue disponível no painel do cliente. */
  isHidden?: boolean;
  /** Destaque visual no painel do cliente. */
  isFavorite?: boolean;
  /** Total de curtidas públicas (❤️). */
  likesCount?: number;
  /** Visualizações da mídia (viewer ou página dedicada). */
  viewCount?: number;
  /** Cliques em baixar. */
  downloadCount?: number;
  /** Cliques em compartilhar. */
  shareCount?: number;
  /** Soft-delete: remove da experiência do app sem apagar o objeto no R2. */
  deletedAt?: string;
  deletedBy?: string;
  /**
   * Ordem manual futura (menor = mais à esquerda / topo).
   * Quando presente, precede a ordenação por data.
   */
  orderIndex?: number;
};

/**
 * Modelo de UI — QR continua apontando para `/video/[id]` (rota estável).
 * Campos duplicados (`videoUrl`, `thumbnail`) mantêm compat com componentes antigos.
 */
export type EventMedia = {
  id: string;
  slug: string;
  title: string;
  event: string;
  eventSlug: string;
  mediaType: MediaKind;
  fileType: string;
  duration: string;
  resolution: string;
  accent: string;
  url: string;
  /** Alias histórico — igual a `url`. */
  videoUrl: string;
  downloadUrl: string;
  qrUrl: string;
  qrCode?: string;
  thumbnail?: string;
  thumbnailUrl?: string;
  isHidden?: boolean;
  isFavorite?: boolean;
  /** Total de curtidas na galeria pública. */
  likesCount?: number;
  deletedAt?: string;
  reviewStatus?: MediaReviewStatus;
  allowPublicDelete: boolean;
  requireDeletePin: boolean;
  allowLikes?: boolean;
  allowMediaShare?: boolean;
  /** ISO para exibição opcional em Momentos ao Vivo. */
  uploadedAt?: string;
  /** Epoch ms para ordenação (derivado do registro). */
  sortAt?: number;
};
