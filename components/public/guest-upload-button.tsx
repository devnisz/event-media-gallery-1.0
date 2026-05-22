"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

type GuestUploadButtonProps = {
  eventId: string;
};

type UploadState = "idle" | "uploading" | "success" | "error";

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

  async function uploadFile(file: File) {
    const formData = new FormData();
    const xhr = new XMLHttpRequest();

    formData.append("file", file);
    setState("uploading");
    setProgress(0);
    setMessage(file.type.startsWith("video/") ? "Gerando miniatura..." : "");

    const thumbnail = await captureVideoThumbnail(file);

    if (thumbnail) {
      formData.append("thumbnail", thumbnail, "thumbnail.jpg");
    }

    setMessage("");

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      setProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      let payload: { error?: string } = {};

      try {
        payload = JSON.parse(xhr.responseText) as { error?: string };
      } catch {
        payload = {};
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        setState("error");
        setMessage(
          payload.error ??
            (xhr.status === 413
              ? "Arquivo muito grande para o limite do servidor."
              : "Não foi possível enviar o arquivo."),
        );
        return;
      }

      setState("success");
      setProgress(100);
      setMessage("Upload recebido. A galeria será atualizada.");
      router.refresh();
    };

    xhr.onerror = () => {
      setState("error");
      setMessage("Falha de rede ao enviar o arquivo.");
    };

    xhr.open("POST", `/api/events/${encodeURIComponent(eventId)}/guest-upload`);
    xhr.send(formData);
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
