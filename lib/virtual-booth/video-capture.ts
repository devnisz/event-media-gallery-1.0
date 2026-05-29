const PREFERRED_MIME_TYPES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4",
];

export function pickVirtualBoothVideoMimeType(): string {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  for (const mimeType of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  return "";
}

function extensionForMimeType(mimeType: string): string {
  if (mimeType.includes("mp4")) {
    return "mp4";
  }

  return "webm";
}

export async function recordVideoFromMediaStream(
  stream: MediaStream,
  maxDurationSeconds: number,
  options: {
    onProgress?: (elapsedSeconds: number, maxSeconds: number) => void;
  } = {},
): Promise<File> {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("Gravação de vídeo não suportada neste navegador.");
  }

  const mimeType = pickVirtualBoothVideoMimeType();

  if (!mimeType) {
    throw new Error("Gravação de vídeo não suportada neste dispositivo.");
  }

  const maxDurationMs = Math.max(1000, maxDurationSeconds * 1000);
  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 2_500_000,
  });

  return new Promise((resolve, reject) => {
    let progressTimer: number | null = null;
    let stopTimer: number | null = null;
    const startedAt = performance.now();

    const cleanup = () => {
      if (progressTimer !== null) {
        window.clearInterval(progressTimer);
      }

      if (stopTimer !== null) {
        window.clearTimeout(stopTimer);
      }
    };

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.onerror = () => {
      cleanup();
      reject(new Error("Não foi possível gravar o vídeo. Tente novamente."));
    };

    recorder.onstop = () => {
      cleanup();

      if (chunks.length === 0) {
        reject(new Error("Nenhum dado de vídeo foi capturado."));
        return;
      }

      const blob = new Blob(chunks, { type: mimeType });
      const extension = extensionForMimeType(mimeType);

      resolve(
        new File([blob], `cabine-video-${Date.now()}.${extension}`, {
          type: mimeType,
          lastModified: Date.now(),
        }),
      );
    };

    try {
      recorder.start(250);
    } catch {
      cleanup();
      reject(new Error("Não foi possível iniciar a gravação."));
      return;
    }

    progressTimer = window.setInterval(() => {
      const elapsedSeconds = Math.min(
        maxDurationSeconds,
        (performance.now() - startedAt) / 1000,
      );
      options.onProgress?.(elapsedSeconds, maxDurationSeconds);
    }, 200);

    stopTimer = window.setTimeout(() => {
      if (recorder.state === "recording") {
        recorder.stop();
      }
    }, maxDurationMs);
  });
}
