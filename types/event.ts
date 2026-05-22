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
};

/** Linha persistida antes da migração de uploadToken (JSON legado). */
export type StoredEventLoose = Omit<GalleryEventRecord, "uploadToken"> & {
  uploadToken?: string;
};
