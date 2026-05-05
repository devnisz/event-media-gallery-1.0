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
};

export function DownloadButton({
  href,
  label = "Baixar mídia",
  fileName,
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

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={loading}
        onClick={() => void onDownload()}
        className="inline-flex min-h-16 items-center justify-center rounded-full bg-white px-8 text-lg font-bold text-slate-950 shadow-[0_18px_60px_rgba(255,255,255,0.2)] transition duration-300 hover:scale-105 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/50 active:scale-95 disabled:pointer-events-none disabled:opacity-60"
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
