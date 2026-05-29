export type GalleryLayout = "premium" | "social";

export const DEFAULT_GALLERY_LAYOUT: GalleryLayout = "premium";

export function normalizeGalleryLayout(value: unknown): GalleryLayout {
  return value === "social" ? "social" : "premium";
}

export function isSocialGalleryLayout(value: unknown): boolean {
  return normalizeGalleryLayout(value) === "social";
}
