export const MAX_POCKET_BOOTH_FRAME_BYTES = 5 * 1024 * 1024;

export function isPocketBoothFrameContentType(value: string): boolean {
  return value.trim().toLowerCase() === "image/png";
}
