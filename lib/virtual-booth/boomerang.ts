/** ~1,2 s de captura a 8 FPS ≈ 10 frames antes da sequência vai-e-volta. */
export const BOOMERANG_CAPTURE_DURATION_MS = 1200;
export const BOOMERANG_CAPTURE_FPS = 8;
export const BOOMERANG_FRAME_COUNT = 10;
export const MIN_VALID_BOOMERANG_FRAMES = 6;

/** Lado maior do GIF final (captura e exportação, inclusive com moldura). */
export const BOOMERANG_MAX_LONG_EDGE = 720;

/** 8 FPS → 125 ms por frame na animação. */
export const BOOMERANG_FRAME_DELAY_MS = 125;

/** Maior valor = mais compressão no gif.js (meta ~1–5 MB). */
export const BOOMERANG_GIF_QUALITY = 22;

export const BOOMERANG_FILE_PREFIX = "cabine-boomerang";

/**
 * Sequência vai-e-volta: frames em ordem + mesma sequência invertida (sem duplicar o último frame).
 * Ex.: [1,2,3,4,5,6,7,8,9,10] → [1..10,9,8,7,6,5,4,3,2,1]
 */
export function buildBoomerangSequence(
  frames: HTMLCanvasElement[],
): HTMLCanvasElement[] {
  if (frames.length <= 1) {
    return [...frames];
  }

  return [...frames, ...frames.slice(0, -1).reverse()];
}
