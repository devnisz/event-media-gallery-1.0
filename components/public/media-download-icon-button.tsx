"use client";

import { useState } from "react";

type MediaDownloadIconButtonProps = {
  href: string;
  fileName: string;
  label: string;
};

async function downloadFile(url: string, filename: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export function MediaDownloadIconButton({
  href,
  fileName,
  label,
}: MediaDownloadIconButtonProps) {
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      aria-label={label}
      disabled={loading}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setLoading(true);
        void downloadFile(href, fileName).finally(() => setLoading(false));
      }}
      className="grid size-11 place-items-center rounded-full bg-black/35 text-lg text-white/90 backdrop-blur-md transition hover:bg-black/50 active:scale-95 disabled:opacity-60 sm:size-12"
    >
      <span aria-hidden>{loading ? "…" : "⬇"}</span>
    </button>
  );
}
