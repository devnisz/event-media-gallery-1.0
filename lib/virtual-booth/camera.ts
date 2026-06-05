export function isMobileCaptureDevice(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export type CameraFacingPreference = "user" | "environment";

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

const ZOOM_CAP = { zoom: { ideal: 1, min: 1, max: 1 } };

function buildWideAngleConstraintSets(): ExtendedVideoConstraints[] {
  return [
    ...buildVideoConstraintsForFacing("environment"),
    ...buildVideoConstraintsForFacing("user"),
    {
      resizeMode: "none",
      ...ZOOM_CAP,
    },
  ];
}

function buildMinimalVideoConstraintsForFacing(
  facing: CameraFacingPreference,
): ExtendedVideoConstraints[] {
  return [
    { facingMode: { exact: facing } },
    { facingMode: { ideal: facing } },
    { facingMode: facing },
  ];
}

function buildVideoConstraintsForFacing(
  facing: CameraFacingPreference,
): ExtendedVideoConstraints[] {
  const shared = {
    width: { ideal: 1280, max: 1920 },
    height: { ideal: 960, max: 1440 },
    aspectRatio: { ideal: 4 / 3 },
    resizeMode: "none" as const,
    ...ZOOM_CAP,
  };

  return [
    { ...shared, facingMode: { ideal: facing } },
    { ...shared, facingMode: { exact: facing } },
    {
      facingMode: { ideal: facing },
      resizeMode: "none",
      ...ZOOM_CAP,
    },
    {
      facingMode: { exact: facing },
      resizeMode: "none",
      ...ZOOM_CAP,
    },
  ];
}

export function oppositeCameraFacing(
  facing: CameraFacingPreference,
): CameraFacingPreference {
  return facing === "user" ? "environment" : "user";
}

function inferFacingFromTrackLabel(label: string): CameraFacingPreference | null {
  const normalized = label.toLowerCase();

  if (
    /front|user|selfie|facial|frontal|face/i.test(normalized)
  ) {
    return "user";
  }

  if (/back|rear|environment|traseir|trás|wide/i.test(normalized)) {
    return "environment";
  }

  return null;
}

export function detectStreamFacing(
  stream: MediaStream,
  fallback: CameraFacingPreference = "environment",
): CameraFacingPreference {
  const [videoTrack] = stream.getVideoTracks();
  const facing = videoTrack?.getSettings?.().facingMode;

  if (facing === "user" || facing === "environment") {
    return facing;
  }

  const fromLabel = inferFacingFromTrackLabel(videoTrack?.label ?? "");

  if (fromLabel) {
    return fromLabel;
  }

  return fallback;
}

export function shouldMirrorCameraPreview(
  facing: CameraFacingPreference,
): boolean {
  return facing === "user";
}

async function minimizeTrackZoom(track: MediaStreamTrack): Promise<void> {
  const capabilities = track.getCapabilities?.() as
    | { zoom?: { min?: number } }
    | undefined;
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
      await track.applyConstraints({
        zoom: zoomCapability.min,
      } as MediaTrackConstraints);
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
  facingMode: CameraFacingPreference;
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

  const videoConstraint = video as MediaTrackConstraints;

  if (!includeAudio) {
    return mediaDevices.getUserMedia({
      audio: false,
      video: videoConstraint,
    });
  }

  try {
    return await mediaDevices.getUserMedia({
      audio: VIRTUAL_BOOTH_AUDIO_CONSTRAINTS,
      video: videoConstraint,
    });
  } catch {
    return mediaDevices.getUserMedia({
      audio: true,
      video: videoConstraint,
    });
  }
}

async function tryAcquireStreamWithAttempts(
  includeAudio: boolean,
  attempts: ExtendedVideoConstraints[],
  options: { allowGenericFallback?: boolean } = {},
): Promise<MediaStream | null> {
  for (const video of attempts) {
    try {
      const stream = await requestUserMediaStream(includeAudio, video);
      return prepareWideAngleStream(stream);
    } catch {
      // Próximo conjunto de constraints.
    }
  }

  if (options.allowGenericFallback === false) {
    return null;
  }

  try {
    const stream = await requestUserMediaStream(includeAudio, true);
    return prepareWideAngleStream(stream);
  } catch {
    return null;
  }
}

async function tryAcquireStreamWithVideoAttempts(
  includeAudio: boolean,
): Promise<MediaStream | null> {
  return tryAcquireStreamWithAttempts(includeAudio, buildWideAngleConstraintSets(), {
    allowGenericFallback: true,
  });
}

async function tryAcquireStreamForFacing(
  includeAudio: boolean,
  facing: CameraFacingPreference,
  options: { strictFacing?: boolean } = {},
): Promise<MediaStream | null> {
  const attempts = options.strictFacing
    ? [
        ...buildMinimalVideoConstraintsForFacing(facing),
        ...buildVideoConstraintsForFacing(facing),
      ]
    : buildVideoConstraintsForFacing(facing);

  return tryAcquireStreamWithAttempts(includeAudio, attempts, {
    allowGenericFallback: !options.strictFacing,
  });
}

function buildStreamResult(
  stream: MediaStream,
  hasAudio: boolean,
  audioWarning: string | null,
  requestedFacing?: CameraFacingPreference,
): VirtualBoothStreamResult {
  const facingMode = requestedFacing ?? detectStreamFacing(stream);

  return {
    stream,
    hasAudio,
    audioWarning,
    facingMode,
  };
}

export type VirtualBoothStreamOptions = {
  includeAudio?: boolean;
  /** Quando definido, força frontal ou traseira (troca de câmera). */
  facingMode?: CameraFacingPreference;
  /** Evita fallback genérico que reabre a mesma câmera durante a troca. */
  strictFacing?: boolean;
};

const CAMERA_HANDOFF_MS = 120;

async function waitForCameraHandoff(): Promise<void> {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, CAMERA_HANDOFF_MS);
  });
}

/**
 * Abre stream da Cabine Virtual. Foto/Boomerang usam só vídeo; gravação de vídeo
 * solicita microfone na mesma permissão (necessário para MediaRecorder com áudio).
 */
export async function startVirtualBoothMediaStream(
  options: VirtualBoothStreamOptions = {},
): Promise<VirtualBoothStreamResult> {
  const includeAudio = options.includeAudio === true;
  const requestedFacing = options.facingMode;
  const strictFacing = options.strictFacing === true;

  if (strictFacing && requestedFacing) {
    await waitForCameraHandoff();
  }

  const acquire = requestedFacing
    ? () =>
        tryAcquireStreamForFacing(includeAudio, requestedFacing, {
          strictFacing,
        })
    : () => tryAcquireStreamWithVideoAttempts(includeAudio);

  if (!includeAudio) {
    const stream = await acquire();

    if (!stream) {
      throw new Error(
        strictFacing
          ? "Não foi possível acessar a câmera selecionada."
          : "Câmera indisponível neste dispositivo.",
      );
    }

    return buildStreamResult(stream, false, null, requestedFacing);
  }

  const streamWithAudio = await acquire();

  if (streamWithAudio && streamHasActiveAudio(streamWithAudio)) {
    return buildStreamResult(streamWithAudio, true, null, requestedFacing);
  }

  stopMediaStream(streamWithAudio);

  const streamVideoOnly = requestedFacing
    ? await tryAcquireStreamForFacing(false, requestedFacing, {
        strictFacing,
      })
    : await tryAcquireStreamWithVideoAttempts(false);

  if (!streamVideoOnly) {
    throw new Error(
      strictFacing
        ? "Não foi possível acessar a câmera selecionada."
        : "Câmera indisponível neste dispositivo.",
    );
  }

  return buildStreamResult(
    streamVideoOnly,
    false,
    virtualBoothMicrophoneWarningMessage(),
    requestedFacing,
  );
}

/** Troca entre câmera frontal e traseira mantendo áudio quando em modo vídeo. */
export async function flipVirtualBoothCameraStream(options: {
  currentFacing: CameraFacingPreference;
  includeAudio: boolean;
}): Promise<VirtualBoothStreamResult> {
  const nextFacing = oppositeCameraFacing(options.currentFacing);

  return startVirtualBoothMediaStream({
    includeAudio: options.includeAudio,
    facingMode: nextFacing,
    strictFacing: true,
  });
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
