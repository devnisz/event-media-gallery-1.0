export type GalleryEventRecord = {
  id: string;
  name: string;
  slug: string;
  /** Token opaco para o watcher associar uploads a este evento. */
  uploadToken: string;
  createdAt: string;
  coverImage: string;
  videosCount: number;
};
