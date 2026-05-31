"use client";

import { useState } from "react";

async function handleDownload(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    a.remove();
    window.URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.error("Download falhou:", err);
    throw err;
  }
}

type DownloadButtonProps = {
  /** URL pública do arquivo (ex.: R2). */
  href: string;
  /** Rótulo do botão (ex.: vídeo vs imagem). */
  label?: string;
  /**
   * Nome sugerido do arquivo ao salvar.
   * Evite `/`, `\\` e caracteres reservados do SO.
   */
  fileName?: string;
  variant?: "primary" | "secondary";
};

export function DownloadButton({
  href,
  label = "Baixar mídia",
  fileName,
  variant = "primary",
}: DownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedName =
    fileName?.trim() && fileName.trim().length > 0
      ? fileName.trim()
      : "midia";

  const onDownload = async () => {
    setError(null);
    setLoading(true);

    try {
      await handleDownload(href, resolvedName);
    } catch {
      setError("Não foi possível baixar o arquivo. Tente de novo.");
    } finally {
      setLoading(false);
    }
  };

  const buttonClassName =
    variant === "secondary"
      ? "inline-flex min-h-14 w-full items-center justify-center rounded-full border border-white/20 bg-white/[0.08] px-6 text-base font-bold text-white backdrop-blur-md transition duration-300 hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/20 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 sm:min-h-[3.25rem]"
      : "inline-flex min-h-14 w-full items-center justify-center rounded-full bg-white px-6 text-base font-black text-slate-950 shadow-[0_18px_60px_rgba(255,255,255,0.2)] transition duration-300 hover:scale-[1.02] hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/50 active:scale-95 disabled:pointer-events-none disabled:opacity-60 sm:min-h-16 sm:px-8 sm:text-lg";

  return (
    <div className="flex w-full flex-col gap-2">
      <button
        type="button"
        disabled={loading}
        onClick={() => void onDownload()}
        className={buttonClassName}
      >
        {loading ? "Baixando…" : label}
      </button>
      {error ? (
        <p className="text-sm font-medium text-amber-200/90" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
