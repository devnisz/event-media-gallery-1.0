"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";

type EventVirtualBoothFrameFormProps = {
  eventId: string;
  initialFrameUrl: string;
};

export function EventVirtualBoothFrameForm({
  eventId,
  initialFrameUrl,
}: EventVirtualBoothFrameFormProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [frameUrl, setFrameUrl] = useState(initialFrameUrl.trim());
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function uploadFrame(file: File) {
    setIsUploading(true);
    setMessage("");
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `/api/events/${encodeURIComponent(eventId)}/virtual-booth-frame`,
        {
          method: "POST",
          body: formData,
        },
      );
      const payload = (await response.json()) as {
        error?: string;
        frameUrl?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível salvar a moldura.");
      }

      setFrameUrl(payload.frameUrl?.trim() ?? "");
      setMessage("Moldura da Cabine Virtual atualizada.");
      router.refresh();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Não foi possível salvar a moldura.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function removeFrame() {
    setIsRemoving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `/api/events/${encodeURIComponent(eventId)}/virtual-booth-frame`,
        { method: "DELETE" },
      );
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível remover a moldura.");
      }

      setFrameUrl("");
      setMessage("Moldura removida.");
      router.refresh();
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Não foi possível remover a moldura.",
      );
    } finally {
      setIsRemoving(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    void uploadFrame(file);
  }

  const busy = isUploading || isRemoving;

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.26em] text-amber-200/80">
        Cabine Virtual
      </p>
      <h2 className="mt-3 text-2xl font-black tracking-tight">
        Fotos da Cabine Virtual
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
        Envie um PNG transparente como moldura oficial. As fotos capturadas na
        galeria pública serão personalizadas automaticamente.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/png"
        className="sr-only"
        disabled={busy}
        onChange={handleFileChange}
      />

      {frameUrl ? (
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={frameUrl}
            alt="Prévia da moldura da Cabine Virtual"
            className="mx-auto max-h-56 w-full object-contain"
          />
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-black/20 px-4 py-10 text-center text-sm text-white/45">
          Nenhuma moldura configurada.
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-black text-slate-950 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUploading ? "Enviando..." : frameUrl ? "Substituir PNG" : "Enviar PNG"}
        </button>

        {frameUrl ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void removeFrame()}
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-bold text-white/75 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRemoving ? "Removendo..." : "Remover moldura"}
          </button>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-sm font-semibold text-red-300">{error}</p> : null}
      {message ? (
        <p className="mt-4 text-sm font-semibold text-emerald-300">{message}</p>
      ) : null}
    </section>
  );
}
