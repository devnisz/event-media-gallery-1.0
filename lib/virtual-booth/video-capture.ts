import {
  normalizeGuestUploadMimeType,
  resolveGuestUploadTypeInfo,
} from "@/lib/guest-upload/validation";

const PREFERRED_MIME_TYPES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4",
];

const MIN_RECORDING_BYTES = 1024;

export type VideoRecordingProgress = {
  /** 0 = anel cheio, 1 = tempo máximo atingido (anel vazio). */
  fraction: number;
  elapsedSeconds: number;
  maxSeconds: number;
};

export type VideoRecordingHandle = {
  stop: () => void;
  finished: Promise<File>;
};

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

function extensionForUploadMimeType(uploadMimeType: string): string {
  const typeInfo = resolveGuestUploadTypeInfo(uploadMimeType);

  return typeInfo?.extension ?? "webm";
}

function buildVideoUploadFile(blob: Blob, uploadMimeType: string): File {
  const extension = extensionForUploadMimeType(uploadMimeType);

  return new File([blob], `cabine-video-${Date.now()}.${extension}`, {
    type: uploadMimeType,
    lastModified: Date.now(),
  });
}

/**
 * Inicia gravação com MediaRecorder. O arquivo final usa MIME aceito pelo upload
 * (`video/webm` ou `video/mp4`, sem sufixo de codecs).
 */
export function startVideoRecordingFromMediaStream(
  stream: MediaStream,
  maxDurationSeconds: number,
  options: {
    onProgress?: (progress: VideoRecordingProgress) => void;
  } = {},
): VideoRecordingHandle {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("Gravação de vídeo não suportada neste navegador.");
  }

  const recorderMimeType = pickVirtualBoothVideoMimeType();

  if (!recorderMimeType) {
    throw new Error("Gravação de vídeo não suportada neste dispositivo.");
  }

  const uploadMimeType = normalizeGuestUploadMimeType(recorderMimeType);

  if (!resolveGuestUploadTypeInfo(uploadMimeType)) {
    throw new Error("Formato de vídeo não suportado para publicação.");
  }

  const hasAudioTrack = stream.getAudioTracks().length > 0;

  const maxDurationMs = Math.max(1000, maxDurationSeconds * 1000);
  const chunks: Blob[] = [];
  let progressTimer: number | null = null;
  let stopTimer: number | null = null;
  let stopRequested = false;
  const startedAt = performance.now();

  const recorder = new MediaRecorder(stream, {
    mimeType: recorderMimeType,
    videoBitsPerSecond: 2_500_000,
    ...(hasAudioTrack ? { audioBitsPerSecond: 128_000 } : {}),
  });

  let resolveFinished!: (file: File) => void;
  let rejectFinished!: (error: Error) => void;

  const finished = new Promise<File>((resolve, reject) => {
    resolveFinished = resolve;
    rejectFinished = reject;
  });

  const cleanupTimers = () => {
    if (progressTimer !== null) {
      window.clearInterval(progressTimer);
      progressTimer = null;
    }

    if (stopTimer !== null) {
      window.clearTimeout(stopTimer);
      stopTimer = null;
    }
  };

  const emitProgress = () => {
    const elapsedMs = performance.now() - startedAt;
    const fraction = Math.min(1, elapsedMs / maxDurationMs);

    options.onProgress?.({
      fraction,
      elapsedSeconds: elapsedMs / 1000,
      maxSeconds: maxDurationSeconds,
    });
  };

  const finalizeRecording = () => {
    cleanupTimers();

    if (chunks.length === 0) {
      rejectFinished(
        new Error("Nenhum dado de vídeo foi capturado. Tente gravar novamente."),
      );
      return;
    }

    const blob = new Blob(chunks, { type: uploadMimeType });

    if (blob.size < MIN_RECORDING_BYTES) {
      rejectFinished(
        new Error("Gravação muito curta. Mantenha a gravação por mais tempo."),
      );
      return;
    }

    resolveFinished(buildVideoUploadFile(blob, uploadMimeType));
  };

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  recorder.onerror = () => {
    cleanupTimers();
    rejectFinished(
      new Error("Não foi possível gravar o vídeo. Tente novamente."),
    );
  };

  recorder.onstop = () => {
    finalizeRecording();
  };

  const stop = () => {
    if (stopRequested || recorder.state !== "recording") {
      return;
    }

    stopRequested = true;
    cleanupTimers();

    try {
      recorder.requestData();
    } catch {
      // Alguns navegadores não expõem requestData; onstop ainda recebe chunks.
    }

    recorder.stop();
  };

  try {
    recorder.start(200);
  } catch {
    cleanupTimers();
    throw new Error("Não foi possível iniciar a gravação.");
  }

  emitProgress();
  progressTimer = window.setInterval(emitProgress, 100);

  stopTimer = window.setTimeout(() => {
    stop();
  }, maxDurationMs);

  return { stop, finished };
}

/** @deprecated Preferir `startVideoRecordingFromMediaStream` com parada manual. */
export async function recordVideoFromMediaStream(
  stream: MediaStream,
  maxDurationSeconds: number,
  options: {
    onProgress?: (elapsedSeconds: number, maxSeconds: number) => void;
  } = {},
): Promise<File> {
  const session = startVideoRecordingFromMediaStream(stream, maxDurationSeconds, {
    onProgress: (progress) => {
      options.onProgress?.(progress.elapsedSeconds, progress.maxSeconds);
    },
  });

  return session.finished;
}
