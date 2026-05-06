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
};

/** Linha persistida antes da migração de uploadToken (JSON legado). */
export type StoredEventLoose = Omit<GalleryEventRecord, "uploadToken"> & {
  uploadToken?: string;
};
