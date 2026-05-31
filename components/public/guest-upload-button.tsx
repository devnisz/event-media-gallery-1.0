"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { dispatchGalleryMediaPublished } from "@/lib/gallery/client-refresh";
import { uploadGuestMediaFile } from "@/lib/guest-upload/upload-client";

type GuestUploadButtonProps = {
  eventId: string;
  eventSlug: string;
  compact?: boolean;
};

type UploadState = "idle" | "uploading" | "success" | "error";

export function GuestUploadButton({
  eventId,
  eventSlug,
  compact = false,
}: GuestUploadButtonProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");

  async function uploadFile(file: File) {
    setState("uploading");
    setProgress(0);
    setMessage("");

    try {
      const publishedMedia = await uploadGuestMediaFile(eventId, file, (update) => {
        setProgress(update.progress);
        setMessage(update.message);
      });

      dispatchGalleryMediaPublished({
        media: publishedMedia,
        eventSlug,
        eventId,
      });

      setState("success");
      setProgress(100);
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
    <div
      className={`flex flex-col ${compact ? "items-end gap-1" : "items-stretch gap-3 sm:items-end"}`}
    >
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
        className={`inline-flex items-center justify-center rounded-full bg-gradient-to-r from-amber-300 to-fuchsia-400 font-black text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 ${
          compact
            ? "size-10 text-lg sm:min-h-10 sm:px-4 sm:text-xs"
            : "min-h-12 px-6 text-sm"
        }`}
        aria-label={isUploading ? "Enviando mídia" : "Enviar fotos e vídeos"}
        title={isUploading ? "Enviando..." : "Enviar"}
      >
        {compact ? (isUploading ? "…" : "+") : isUploading ? "Enviando..." : "Enviar fotos e vídeos"}
      </button>
      {!compact && isUploading ? (
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10 sm:w-64">
          <div
            className="h-full rounded-full bg-amber-300 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}
      {!compact && message ? (
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
