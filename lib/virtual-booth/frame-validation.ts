export const MAX_VIRTUAL_BOOTH_FRAME_BYTES = 5 * 1024 * 1024;

export function isVirtualBoothFrameContentType(value: string): boolean {
  return value.trim().toLowerCase() === "image/png";
}
