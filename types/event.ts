import type { GalleryLayout } from "@/lib/gallery/layout";

export type GalleryEventRecord = {
  id: string;
  name: string;
  slug: string;
  /** Token opaco para o watcher associar uploads a este evento. */
  uploadToken: string;
  createdAt: string;
  coverImage: string;
  videosCount: number;
  /** Dono SaaS (Supabase Auth). Legado pode estar ausente. */
  ownerUserId?: string;
  /** Permite soft-delete publico de midias deste evento. */
  allowPublicDelete: boolean;
  /** Exige PIN para soft-delete publico. */
  requireDeletePin: boolean;
  /** Hash com salt do PIN. Nunca expor ao client publico. */
  deletePinHash?: string;
  /** Permite upload publico sem login por convidados. */
  allowGuestUpload: boolean;
  /** Quando ligado, uploads guest ficam pendentes ate aprovacao no dashboard. */
  requireGuestUploadApproval: boolean;
  /** Moldura PNG opcional da Cabine Virtual (URL pública). */
  frameUrl: string;
  /** Layout publico da galeria: premium (padrao) ou social. */
  galleryLayout: GalleryLayout;
  /** Cabine Virtual habilitada na galeria publica. */
  cabineVirtualEnabled?: boolean;
  cabineVirtualPhotoEnabled?: boolean;
  cabineVirtualBoomerangEnabled?: boolean;
  cabineVirtualVideoEnabled?: boolean;
  /** Duracao maxima de gravacao de video na Cabine (5–30 s). */
  cabineVirtualVideoMaxDurationSeconds?: number;
};

/** Linha persistida antes da migração de uploadToken (JSON legado). */
export type StoredEventLoose = Omit<GalleryEventRecord, "uploadToken"> & {
  uploadToken?: string;
};
