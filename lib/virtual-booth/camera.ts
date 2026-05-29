export function isMobileCaptureDevice(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export async function hasVideoInputDevice(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
    return false;
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some((device) => device.kind === "videoinput");
  } catch {
    return false;
  }
}

export async function canCapturePhoto(): Promise<boolean> {
  if (isMobileCaptureDevice()) {
    return true;
  }

  return hasVideoInputDevice();
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
