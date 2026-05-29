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

export async function startVirtualBoothPhotoStream(): Promise<MediaStream> {
  const mediaDevices =
    typeof navigator === "undefined" ? undefined : navigator.mediaDevices;

  if (!mediaDevices) {
    throw new Error("Câmera indisponível neste dispositivo.");
  }

  const attempts = buildWideAngleConstraintSets();
  let lastError: unknown;

  for (const video of attempts) {
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: false,
        video: video as MediaTrackConstraints,
      });
      return prepareWideAngleStream(stream);
    } catch (error) {
      lastError = error;
    }
  }

  try {
    const stream = await mediaDevices.getUserMedia({ audio: false, video: true });
    return prepareWideAngleStream(stream);
  } catch (error) {
    throw lastError instanceof Error ? lastError : error;
  }
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
