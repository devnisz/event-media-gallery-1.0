"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

type GuestUploadButtonProps = {
  eventId: string;
};

type UploadState = "idle" | "uploading" | "success" | "error";

type SignResponse = {
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

function captureVideoThumbnail(file: File): Promise<Blob | null> {
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

export function GuestUploadButton({ eventId }: GuestUploadButtonProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");

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

        reject(new Error(`Falha no envio de ${label} para o storage (${xhr.status}).`));
      };

      xhr.onerror = () =>
        reject(
          new Error(
            `Falha de rede/CORS ao enviar ${label} para o R2. Verifique a política CORS do bucket para este domínio.`,
          ),
        );
      xhr.ontimeout = () =>
        reject(new Error(`Tempo esgotado ao enviar ${label}. Tente uma rede Wi-Fi ou arquivo menor.`));
      xhr.open("PUT", url);
      xhr.setRequestHeader("Content-Type", contentType);
      xhr.send(blob);
    });
  }

  async function uploadFile(file: File) {
    setState("uploading");
    setProgress(0);
    setMessage(file.type.startsWith("video/") ? "Gerando miniatura..." : "");

    const thumbnail = await captureVideoThumbnail(file);

    try {
      setMessage("Preparando upload...");
      const signResponse = await fetch(
        `/api/events/${encodeURIComponent(eventId)}/guest-upload/sign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileType: file.type,
            fileSize: file.size,
            hasThumbnail: Boolean(thumbnail),
            thumbnailType: thumbnail?.type,
            thumbnailSize: thumbnail?.size,
          }),
        },
      );
      const signPayload = (await signResponse.json()) as SignResponse;

      if (!signResponse.ok || !signPayload.mediaId || !signPayload.upload) {
        throw new Error(
          signPayload.error ??
            (signResponse.status === 413
              ? "Arquivo muito grande para o limite do servidor."
              : "Não foi possível preparar o upload."),
        );
      }

      setMessage("Enviando arquivo...");
      await putToSignedUrl({
        url: signPayload.upload.uploadUrl,
        blob: file,
        contentType: file.type,
        label: "arquivo",
        onProgress: setProgress,
      });

      if (thumbnail && signPayload.thumbnail) {
        setMessage("Enviando miniatura...");
        await putToSignedUrl({
          url: signPayload.thumbnail.uploadUrl,
          blob: thumbnail,
          contentType: thumbnail.type,
          label: "miniatura",
        });
      }

      setMessage("Finalizando upload...");
      const completeResponse = await fetch(
        `/api/events/${encodeURIComponent(eventId)}/guest-upload/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mediaId: signPayload.mediaId,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
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

      setState("success");
      setProgress(100);
      setMessage("Upload recebido. A galeria será atualizada.");
      router.refresh();
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error ? error.message : "Não foi possível enviar o arquivo.",
      );
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    void uploadFile(file);
    event.target.value = "";
  }

  const isUploading = state === "uploading";

  return (
    <div className="flex flex-col items-stretch gap-3 sm:items-end">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
        className="sr-only"
        disabled={isUploading}
        onChange={handleFileChange}
      />
      <button
        type="button"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-black text-slate-950 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isUploading ? "Enviando..." : "Enviar fotos e vídeos"}
      </button>
      {isUploading ? (
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10 sm:w-64">
          <div
            className="h-full rounded-full bg-amber-300 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}
      {message ? (
        <p
          className={`max-w-xs text-sm font-semibold ${
            state === "error" ? "text-red-200" : "text-emerald-200"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
