import { normalizeGuestUploadMimeType } from "@/lib/guest-upload/validation";

export type GuestUploadSignResponse = {
  error?: string;
  mediaId?: string;
  upload?: {
    uploadUrl: string;
    publicUrl: string;
  };
  thumbnail?: {
    uploadUrl: string;
    publicUrl: string;
  };
};

export type GuestUploadProgressUpdate = {
  progress: number;
  message: string;
};

function putToSignedUrl({
  url,
  blob,
  contentType,
  label,
  onProgress,
}: {
  url: string;
  blob: Blob;
  contentType: string;
  label: string;
  onProgress?: (progress: number) => void;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.timeout = 10 * 60 * 1000;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }

      reject(
        new Error(`Falha no envio de ${label} para o storage (${xhr.status}).`),
      );
    };

    xhr.onerror = () =>
      reject(
        new Error(
          `Falha de rede/CORS ao enviar ${label} para o R2. Verifique a política CORS do bucket para este domínio.`,
        ),
      );
    xhr.ontimeout = () =>
      reject(
        new Error(`Tempo esgotado ao enviar ${label}. Tente uma rede Wi-Fi ou arquivo menor.`),
      );
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.send(blob);
  });
}

export function captureVideoThumbnail(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("video/")) {
      resolve(null);
      return;
    }

    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    let settled = false;

    function finish(blob: Blob | null) {
      if (settled) {
        return;
      }

      settled = true;
      URL.revokeObjectURL(objectUrl);
      resolve(blob);
    }

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = objectUrl;

    video.onloadedmetadata = () => {
      const targetTime = Number.isFinite(video.duration)
        ? Math.min(0.5, Math.max(0, video.duration / 10))
        : 0;

      try {
        video.currentTime = targetTime;
      } catch {
        finish(null);
      }
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      const width = video.videoWidth || 720;
      const height = video.videoHeight || 1280;

      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")?.drawImage(video, 0, 0, width, height);
      canvas.toBlob((blob) => finish(blob), "image/jpeg", 0.82);
    };

    video.onerror = () => finish(null);
  });
}

/** Fluxo de upload público de convidado (sign → R2 → complete). */
export async function uploadGuestMediaFile(
  eventId: string,
  file: File,
  onProgress?: (update: GuestUploadProgressUpdate) => void,
): Promise<void> {
  const uploadMimeType = normalizeGuestUploadMimeType(file.type);
  const uploadFile =
    uploadMimeType === file.type
      ? file
      : new File([file], file.name, {
          type: uploadMimeType,
          lastModified: file.lastModified,
        });

  onProgress?.({
    progress: 0,
    message: uploadFile.type.startsWith("video/")
      ? "Gerando miniatura..."
      : "Preparando upload...",
  });

  const thumbnail = await captureVideoThumbnail(uploadFile);

  onProgress?.({ progress: 0, message: "Preparando upload..." });

  const signResponse = await fetch(
    `/api/events/${encodeURIComponent(eventId)}/guest-upload/sign`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileType: uploadFile.type,
        fileSize: uploadFile.size,
        hasThumbnail: Boolean(thumbnail),
        thumbnailType: thumbnail?.type,
        thumbnailSize: thumbnail?.size,
      }),
    },
  );
  const signPayload = (await signResponse.json()) as GuestUploadSignResponse;

  if (!signResponse.ok || !signPayload.mediaId || !signPayload.upload) {
    throw new Error(
      signPayload.error ??
        (signResponse.status === 413
          ? "Arquivo muito grande para o limite do servidor."
          : "Não foi possível preparar o upload."),
    );
  }

  onProgress?.({ progress: 5, message: "Enviando arquivo..." });

  await putToSignedUrl({
    url: signPayload.upload.uploadUrl,
    blob: uploadFile,
    contentType: uploadFile.type,
    label: "arquivo",
    onProgress: (progress) => onProgress?.({ progress, message: "Enviando arquivo..." }),
  });

  if (thumbnail && signPayload.thumbnail) {
    onProgress?.({ progress: 92, message: "Enviando miniatura..." });
    await putToSignedUrl({
      url: signPayload.thumbnail.uploadUrl,
      blob: thumbnail,
      contentType: thumbnail.type,
      label: "miniatura",
    });
  }

  onProgress?.({ progress: 98, message: "Finalizando upload..." });

  const completeResponse = await fetch(
    `/api/events/${encodeURIComponent(eventId)}/guest-upload/complete`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mediaId: signPayload.mediaId,
        fileName: uploadFile.name,
        fileType: uploadFile.type,
        fileSize: uploadFile.size,
        publicUrl: signPayload.upload.publicUrl,
        thumbnailUrl: signPayload.thumbnail?.publicUrl,
      }),
    },
  );
  const completePayload = (await completeResponse.json()) as { error?: string };

  if (!completeResponse.ok) {
    throw new Error(
      completePayload.error ?? "Não foi possível finalizar o upload.",
    );
  }

  onProgress?.({ progress: 100, message: "Upload recebido. A galeria será atualizada." });
}
