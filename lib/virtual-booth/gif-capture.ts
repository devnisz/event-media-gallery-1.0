export const GIF_CAPTURE_DURATION_MS = 3000;
export const GIF_CAPTURE_FPS = 10;
export const GIF_FRAME_DELAY_MS = 100;
export const GIF_FRAME_COUNT = 30;
export const GIF_MAX_LONG_EDGE = 720;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function getScaledDimensions(
  sourceWidth: number,
  sourceHeight: number,
  maxLongEdge: number,
): { width: number; height: number } {
  const scale = Math.min(1, maxLongEdge / Math.max(sourceWidth, sourceHeight));
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  };
}

export function captureVideoFrameCanvas(
  video: HTMLVideoElement,
  dimensions: { width: number; height: number },
  options: { mirror?: boolean } = {},
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas não disponível neste dispositivo.");
  }

  if (options.mirror) {
    context.translate(dimensions.width, 0);
    context.scale(-1, 1);
  }

  context.drawImage(video, 0, 0, dimensions.width, dimensions.height);

  return canvas;
}

export async function captureGifFramesFromVideo(
  video: HTMLVideoElement,
  options: {
    durationMs?: number;
    fps?: number;
    mirror?: boolean;
    maxLongEdge?: number;
    onProgress?: (frameIndex: number, totalFrames: number) => void;
  } = {},
): Promise<HTMLCanvasElement[]> {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;

  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error("A câmera ainda não está pronta para capturar.");
  }

  const durationMs = options.durationMs ?? GIF_CAPTURE_DURATION_MS;
  const fps = options.fps ?? GIF_CAPTURE_FPS;
  const totalFrames = Math.max(1, Math.round((durationMs / 1000) * fps));
  const intervalMs = durationMs / totalFrames;
  const dimensions = getScaledDimensions(
    sourceWidth,
    sourceHeight,
    options.maxLongEdge ?? GIF_MAX_LONG_EDGE,
  );
  const frames: HTMLCanvasElement[] = [];

  for (let index = 0; index < totalFrames; index += 1) {
    if (index > 0) {
      await sleep(intervalMs);
    }

    frames.push(captureVideoFrameCanvas(video, dimensions, options));
    options.onProgress?.(index + 1, totalFrames);
  }

  return frames;
}
