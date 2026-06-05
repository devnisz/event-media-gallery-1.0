export function isMobileCaptureDevice(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function canvasToJpegFile(
  canvas: HTMLCanvasElement,
  fileName: string,
  quality = 0.92,
): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Não foi possível gerar a foto capturada."));
          return;
        }

        resolve(
          new File([blob], fileName, {
            type: "image/jpeg",
            lastModified: Date.now(),
          }),
        );
      },
      "image/jpeg",
      quality,
    );
  });
}

export async function hasVideoInputDevice(): Promise<boolean> {
  const mediaDevices =
    typeof navigator === "undefined" ? undefined : navigator.mediaDevices;

  if (!mediaDevices) {
    return false;
  }

  try {
    const devices = await mediaDevices.enumerateDevices();
    return devices.some((device) => device.kind === "videoinput");
  } catch {
    return false;
  }
}

export async function canCapturePhoto(): Promise<boolean> {
  if (typeof navigator === "undefined") {
    return false;
  }

  return Boolean(navigator.mediaDevices);
}

type ExtendedVideoConstraints = MediaTrackConstraints & {
  resizeMode?: ConstrainDOMString;
  zoom?: ConstrainDouble;
};

function buildWideAngleConstraintSets(): ExtendedVideoConstraints[] {
  const zoomCap = { zoom: { ideal: 1, min: 1, max: 1 } };

  return [
    {
      facingMode: { ideal: "environment" },
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 960, max: 1440 },
      aspectRatio: { ideal: 4 / 3 },
      resizeMode: "none",
      ...zoomCap,
    },
    {
      facingMode: { ideal: "user" },
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 960, max: 1440 },
      aspectRatio: { ideal: 4 / 3 },
      resizeMode: "none",
      ...zoomCap,
    },
    {
      facingMode: { ideal: "environment" },
      resizeMode: "none",
      ...zoomCap,
    },
    {
      facingMode: { ideal: "user" },
      resizeMode: "none",
      ...zoomCap,
    },
    {
      resizeMode: "none",
      ...zoomCap,
    },
  ];
}

async function minimizeTrackZoom(track: MediaStreamTrack): Promise<void> {
  const capabilities = track.getCapabilities?.() as { zoom?: { min?: number } } | undefined;
  const zoomCapability = capabilities?.zoom;

  if (!zoomCapability || typeof zoomCapability.min !== "number") {
    return;
  }

  try {
    await track.applyConstraints({
      advanced: [{ zoom: zoomCapability.min } as MediaTrackConstraintSet],
    });
  } catch {
    try {
      await track.applyConstraints({ zoom: zoomCapability.min } as MediaTrackConstraints);
    } catch {
      // Nem todos os navegadores expõem zoom nas constraints.
    }
  }
}

async function prepareWideAngleStream(stream: MediaStream): Promise<MediaStream> {
  const [videoTrack] = stream.getVideoTracks();

  if (videoTrack) {
    await minimizeTrackZoom(videoTrack);
  }

  return stream;
}

export type VirtualBoothStreamResult = {
  stream: MediaStream;
  hasAudio: boolean;
  /** Preenchido quando o vídeo segue sem áudio (microfone negado ou indisponível). */
  audioWarning: string | null;
};

const VIRTUAL_BOOTH_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
};

export function streamHasActiveAudio(stream: MediaStream): boolean {
  return stream
    .getAudioTracks()
    .some((track) => track.enabled && track.readyState === "live");
}

/** Mensagem amigável quando o microfone não pôde ser usado na gravação de vídeo. */
export function virtualBoothMicrophoneWarningMessage(): string {
  return "Microfone bloqueado ou indisponível. O vídeo será gravado sem áudio. Para incluir som, permita o microfone nas configurações do navegador e grave novamente.";
}

/**
 * Limitações conhecidas em mobile:
 * - iOS Safari: MediaRecorder e áudio exigem permissão explícita de câmera + microfone
 *   na mesma chamada getUserMedia; versões antigas podem não suportar gravação.
 * - Android Chrome: geralmente grava WebM com Opus quando o stream inclui faixa de áudio.
 * - Preview da câmera permanece mudo (autoplay); isso não afeta o áudio gravado no arquivo.
 */
export function virtualBoothVideoAudioPlatformNote(): string {
  if (typeof navigator === "undefined") {
    return "";
  }

  const ua = navigator.userAgent;

  if (/iPhone|iPad|iPod/i.test(ua)) {
    return "No iPhone/iPad, permita câmera e microfone quando o navegador solicitar. Use Safari atualizado para gravação com som.";
  }

  if (/Android/i.test(ua)) {
    return "No Android, toque em Permitir para câmera e microfone na primeira gravação.";
  }

  return "";
}

async function requestUserMediaStream(
  includeAudio: boolean,
  video: boolean | MediaTrackConstraints,
): Promise<MediaStream> {
  const mediaDevices =
    typeof navigator === "undefined" ? undefined : navigator.mediaDevices;

  if (!mediaDevices) {
    throw new Error("Câmera indisponível neste dispositivo.");
  }

  return mediaDevices.getUserMedia({
    audio: includeAudio ? VIRTUAL_BOOTH_AUDIO_CONSTRAINTS : false,
    video: video as MediaTrackConstraints,
  });
}

async function tryAcquireStreamWithVideoAttempts(
  includeAudio: boolean,
): Promise<MediaStream | null> {
  const attempts = buildWideAngleConstraintSets();

  for (const video of attempts) {
    try {
      const stream = await requestUserMediaStream(includeAudio, video);
      return prepareWideAngleStream(stream);
    } catch {
      // Próximo conjunto de constraints.
    }
  }

  try {
    const stream = await requestUserMediaStream(includeAudio, true);
    return prepareWideAngleStream(stream);
  } catch {
    return null;
  }
}

/**
 * Abre stream da Cabine Virtual. Foto/Boomerang usam só vídeo; gravação de vídeo
 * solicita microfone na mesma permissão (necessário para MediaRecorder com áudio).
 */
export async function startVirtualBoothMediaStream(
  options: { includeAudio?: boolean } = {},
): Promise<VirtualBoothStreamResult> {
  const includeAudio = options.includeAudio === true;

  if (!includeAudio) {
    const stream = await tryAcquireStreamWithVideoAttempts(false);

    if (!stream) {
      throw new Error("Câmera indisponível neste dispositivo.");
    }

    return { stream, hasAudio: false, audioWarning: null };
  }

  try {
    const streamWithAudio = await tryAcquireStreamWithVideoAttempts(true);

    if (streamWithAudio && streamHasActiveAudio(streamWithAudio)) {
      return {
        stream: streamWithAudio,
        hasAudio: true,
        audioWarning: null,
      };
    }

    stopMediaStream(streamWithAudio);
  } catch {
    // Falha com áudio — tenta só vídeo abaixo.
  }

  const streamVideoOnly = await tryAcquireStreamWithVideoAttempts(false);

  if (!streamVideoOnly) {
    throw new Error("Câmera indisponível neste dispositivo.");
  }

  return {
    stream: streamVideoOnly,
    hasAudio: false,
    audioWarning: virtualBoothMicrophoneWarningMessage(),
  };
}

export async function startVirtualBoothPhotoStream(): Promise<MediaStream> {
  const { stream } = await startVirtualBoothMediaStream({ includeAudio: false });
  return stream;
}

export function stopMediaStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

export async function capturePhotoFromVideo(
  video: HTMLVideoElement,
  options: { mirror?: boolean } = {},
): Promise<File> {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;

  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error("A câmera ainda não está pronta para capturar.");
  }

  const maxLongEdge = 1600;
  const scale = Math.min(1, maxLongEdge / Math.max(sourceWidth, sourceHeight));
  const width = Math.round(sourceWidth * scale);
  const height = Math.round(sourceHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas não disponível neste dispositivo.");
  }

  if (options.mirror) {
    context.translate(width, 0);
    context.scale(-1, 1);
  }

  context.drawImage(video, 0, 0, width, height);

  return canvasToJpegFile(canvas, `cabine-virtual-${Date.now()}.jpg`);
}

export function buildVirtualBoothPhotoFile(source: File): File {
  if (source.name.trim()) {
    return source;
  }

  const extension = source.type === "image/png" ? "png" : "jpg";

  return new File([source], `cabine-virtual-${Date.now()}.${extension}`, {
    type: source.type || "image/jpeg",
    lastModified: source.lastModified,
  });
}
