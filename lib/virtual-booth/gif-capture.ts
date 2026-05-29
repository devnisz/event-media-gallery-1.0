export const GIF_CAPTURE_DURATION_MS = 3000;
export const GIF_CAPTURE_FPS = 10;
export const GIF_FRAME_DELAY_MS = 100;
export const GIF_FRAME_COUNT = 30;
export const GIF_MAX_LONG_EDGE = 720;
export const MIN_VALID_GIF_FRAMES = 10;

export type GifCaptureStats = {
  attempted: number;
  captured: number;
  skipped: number;
  videoWidth: number;
  videoHeight: number;
};

export type GifCaptureResult = {
  frames: HTMLCanvasElement[];
  stats: GifCaptureStats;
};

function logGifCapture(label: string, ...args: unknown[]) {
  console.log(`[Cabine Virtual ${label}]`, ...args);
}

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

export function getScaledDimensions(
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

/** Reduz o canvas mantendo proporção (lado maior ≤ maxLongEdge). */
export function scaleCanvasToMaxLongEdge(
  source: HTMLCanvasElement,
  maxLongEdge: number,
): HTMLCanvasElement {
  const { width, height } = getScaledDimensions(
    source.width,
    source.height,
    maxLongEdge,
  );

  if (width === source.width && height === source.height) {
    return source;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas não disponível neste dispositivo.");
  }

  context.drawImage(source, 0, 0, width, height);
  return canvas;
}

export function isVideoReadyForCapture(video: HTMLVideoElement): boolean {
  return (
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
    video.videoWidth > 0 &&
    video.videoHeight > 0
  );
}

async function waitForVideoReady(
  video: HTMLVideoElement,
  timeoutMs = 4000,
): Promise<boolean> {
  if (isVideoReadyForCapture(video)) {
    return true;
  }

  const startedAt = performance.now();

  return new Promise((resolve) => {
    const check = () => {
      if (isVideoReadyForCapture(video)) {
        resolve(true);
        return;
      }

      if (performance.now() - startedAt >= timeoutMs) {
        resolve(false);
        return;
      }

      requestAnimationFrame(check);
    };

    check();
  });
}

function isCanvasFrameValid(canvas: HTMLCanvasElement): boolean {
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context || canvas.width <= 0 || canvas.height <= 0) {
    return false;
  }

  const sampleWidth = Math.min(40, canvas.width);
  const sampleHeight = Math.min(40, canvas.height);
  const startX = Math.floor((canvas.width - sampleWidth) / 2);
  const startY = Math.floor((canvas.height - sampleHeight) / 2);

  let brightnessSum = 0;

  try {
    const { data } = context.getImageData(startX, startY, sampleWidth, sampleHeight);

    for (let index = 0; index < data.length; index += 4) {
      brightnessSum += data[index] + data[index + 1] + data[index + 2];
    }
  } catch {
    return false;
  }

  return brightnessSum > 600;
}

/**
 * Captura um único frame em canvas novo (nunca reutilizado).
 * Retorna null se o vídeo não estiver pronto ou o draw falhar.
 */
export function captureVideoFrameCanvas(
  video: HTMLVideoElement,
  dimensions: { width: number; height: number },
  options: { mirror?: boolean } = {},
): HTMLCanvasElement | null {
  if (!isVideoReadyForCapture(video)) {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;

  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return null;
  }

  context.fillStyle = "#101010";
  context.fillRect(0, 0, dimensions.width, dimensions.height);

  try {
    if (options.mirror) {
      context.save();
      context.translate(dimensions.width, 0);
      context.scale(-1, 1);
    }

    context.drawImage(video, 0, 0, dimensions.width, dimensions.height);

    if (options.mirror) {
      context.restore();
    }
  } catch {
    return null;
  }

  if (!isCanvasFrameValid(canvas)) {
    return null;
  }

  return canvas;
}

export function cloneCanvasFrame(source: HTMLCanvasElement): HTMLCanvasElement {
  const copy = document.createElement("canvas");
  copy.width = source.width;
  copy.height = source.height;

  const context = copy.getContext("2d");

  if (!context) {
    throw new Error("Canvas não disponível neste dispositivo.");
  }

  context.drawImage(source, 0, 0);
  return copy;
}

export async function captureGifFramesFromVideo(
  video: HTMLVideoElement,
  options: {
    durationMs?: number;
    fps?: number;
    mirror?: boolean;
    maxLongEdge?: number;
    minValidFrames?: number;
    logLabel?: string;
    onProgress?: (frameIndex: number, totalFrames: number) => void;
  } = {},
): Promise<GifCaptureResult> {
  const videoReady = await waitForVideoReady(video);

  if (!videoReady) {
    throw new Error("Não foi possível gerar o GIF. Tente novamente.");
  }

  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  const durationMs = options.durationMs ?? GIF_CAPTURE_DURATION_MS;
  const fps = options.fps ?? GIF_CAPTURE_FPS;
  const totalFrames = Math.max(1, Math.round((durationMs / 1000) * fps));
  const intervalMs = durationMs / totalFrames;
  const dimensions = getScaledDimensions(
    sourceWidth,
    sourceHeight,
    options.maxLongEdge ?? GIF_MAX_LONG_EDGE,
  );

  const logLabel = options.logLabel ?? "GIF";

  logGifCapture(logLabel, "início da captura", {
    videoWidth: sourceWidth,
    videoHeight: sourceHeight,
    canvasWidth: dimensions.width,
    canvasHeight: dimensions.height,
    totalFrames,
    intervalMs,
    readyState: video.readyState,
  });

  const frames: HTMLCanvasElement[] = [];
  let skipped = 0;
  const startedAt = performance.now();

  for (let index = 0; index < totalFrames; index += 1) {
    if (index > 0) {
      const targetTime = startedAt + index * intervalMs;

      while (performance.now() < targetTime) {
        await waitForNextPaint();
      }
    } else {
      await waitForNextPaint();
    }

    const frame = captureVideoFrameCanvas(video, dimensions, options);

    if (frame) {
      frames.push(frame);
      logGifCapture(logLabel, "frame válido", {
        index: index + 1,
        totalFrames,
        frameWidth: frame.width,
        frameHeight: frame.height,
      });
    } else {
      skipped += 1;
      logGifCapture(logLabel, "frame ignorado", {
        index: index + 1,
        totalFrames,
        readyState: video.readyState,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
      });
    }

    options.onProgress?.(index + 1, totalFrames);
  }

  const stats: GifCaptureStats = {
    attempted: totalFrames,
    captured: frames.length,
    skipped,
    videoWidth: sourceWidth,
    videoHeight: sourceHeight,
  };

  logGifCapture(logLabel, "captura finalizada", stats);

  const minValid = options.minValidFrames ?? MIN_VALID_GIF_FRAMES;

  if (frames.length < minValid) {
    throw new Error("Não foi possível gerar o GIF. Tente novamente.");
  }

  return { frames, stats };
}
