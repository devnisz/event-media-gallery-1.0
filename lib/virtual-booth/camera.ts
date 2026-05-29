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

export async function startVirtualBoothPhotoStream(): Promise<MediaStream> {
  const mediaDevices =
    typeof navigator === "undefined" ? undefined : navigator.mediaDevices;

  if (!mediaDevices) {
    throw new Error("Câmera indisponível neste dispositivo.");
  }

  const portraitSelfieConstraints: MediaStreamConstraints = {
    audio: false,
    video: {
      facingMode: "user",
      width: { ideal: 1080 },
      height: { ideal: 1440 },
    },
  };

  try {
    return await mediaDevices.getUserMedia(portraitSelfieConstraints);
  } catch {
    return mediaDevices.getUserMedia({
      audio: false,
      video: true,
    });
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
