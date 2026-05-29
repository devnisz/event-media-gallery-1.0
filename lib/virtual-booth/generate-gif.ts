import GIF from "gif.js";

import {
  composeCanvasWithFrame,
  loadFrameImageFromUrl,
} from "@/lib/virtual-booth/apply-frame";
import {
  ALWAYS_ON_GLAM_FILTER,
  applyGlamToCanvas,
  type GlamFilterConfig,
} from "@/lib/virtual-booth/glam-filter";
import {
  cloneCanvasFrame,
  GIF_CAPTURE_FPS,
  GIF_FRAME_DELAY_MS,
} from "@/lib/virtual-booth/gif-capture";

export async function encodeCanvasesToGifFile(
  frames: HTMLCanvasElement[],
  fileName?: string,
  logLabel = "GIF",
): Promise<File> {
  if (frames.length === 0) {
    throw new Error("Nenhum frame disponível para gerar o GIF.");
  }

  const firstFrame = frames[0];

  return new Promise((resolve, reject) => {
    const gif = new GIF({
      workers: 2,
      quality: 14,
      workerScript: "/gif.worker.js",
      width: firstFrame.width,
      height: firstFrame.height,
      repeat: 0,
    });

    let addedFrames = 0;

    for (const frame of frames) {
      const snapshot = cloneCanvasFrame(frame);
      gif.addFrame(snapshot, { delay: GIF_FRAME_DELAY_MS, copy: true });
      addedFrames += 1;
    }

    console.log(`[Cabine Virtual ${logLabel}] frames adicionados ao encoder`, {
      received: frames.length,
      added: addedFrames,
      width: firstFrame.width,
      height: firstFrame.height,
    });

    gif.on("finished", (blob) => {
      resolve(
        new File([blob], fileName ?? `cabine-virtual-${Date.now()}.gif`, {
          type: "image/gif",
          lastModified: Date.now(),
        }),
      );
    });

    gif.on("error", (error) => {
      reject(error);
    });

    gif.render();
  });
}

export async function processVirtualBoothGifFrames(
  rawFrames: HTMLCanvasElement[],
  options: {
    frameUrl?: string;
    glamConfig?: GlamFilterConfig;
    fileNamePrefix?: string;
    logLabel?: string;
    onStage?: (message: string) => void;
  } = {},
): Promise<{ glamGif: File; framedGif: File | null }> {
  const glamConfig = options.glamConfig ?? ALWAYS_ON_GLAM_FILTER;
  const fileNamePrefix = options.fileNamePrefix ?? "cabine-virtual";
  const logLabel = options.logLabel ?? "GIF";
  const timestamp = Date.now();

  options.onStage?.("Aplicando filtro Glam automático...");

  const glamFrames = rawFrames.map((frame, index) => {
    const copy = cloneCanvasFrame(frame);
    applyGlamToCanvas(copy, glamConfig);
    console.log(`[Cabine Virtual ${logLabel}] glam aplicado`, {
      index: index + 1,
      width: copy.width,
      height: copy.height,
    });
    return copy;
  });

  const glamGif = await encodeCanvasesToGifFile(
    glamFrames,
    `${fileNamePrefix}-glam-${timestamp}.gif`,
    logLabel,
  );

  const frameUrl = options.frameUrl?.trim() ?? "";

  if (!frameUrl) {
    return { glamGif, framedGif: null };
  }

  options.onStage?.("Aplicando a moldura oficial do evento...");

  const frameImage = await loadFrameImageFromUrl(frameUrl);
  const framedFrames = glamFrames.map((frame) =>
    composeCanvasWithFrame(frame, frameImage),
  );

  options.onStage?.("Gerando GIF...");

  const framedGif = await encodeCanvasesToGifFile(
    framedFrames,
    `${fileNamePrefix}-moldura-${timestamp}.gif`,
    logLabel,
  );

  return { glamGif, framedGif };
}

export { GIF_CAPTURE_FPS, GIF_FRAME_DELAY_MS };
