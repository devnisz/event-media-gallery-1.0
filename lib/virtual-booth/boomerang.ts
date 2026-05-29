export const BOOMERANG_CAPTURE_DURATION_MS = 2000;
export const BOOMERANG_CAPTURE_FPS = 10;
export const BOOMERANG_FRAME_COUNT = 20;
export const MIN_VALID_BOOMERANG_FRAMES = 8;
export const BOOMERANG_FILE_PREFIX = "cabine-boomerang";

/**
 * Sequência vai-e-volta: frames em ordem + mesma sequência invertida (sem duplicar o último frame).
 * Ex.: [1,2,3,4,5,6,7,8] → [1..8,7,6,5,4,3,2,1]
 */
export function buildBoomerangSequence(
  frames: HTMLCanvasElement[],
): HTMLCanvasElement[] {
  if (frames.length <= 1) {
    return [...frames];
  }

  return [...frames, ...frames.slice(0, -1).reverse()];
}
