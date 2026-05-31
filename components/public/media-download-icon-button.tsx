"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";

import {
  mediaGlassActionButtonClass,
  mediaGlassActionIconClass,
} from "@/components/public/media-glass-action-styles";

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
      className={mediaGlassActionButtonClass}
    >
      {loading ? (
        <Loader2
          aria-hidden
          className={`${mediaGlassActionIconClass} animate-spin`}
        />
      ) : (
        <Download aria-hidden className={mediaGlassActionIconClass} />
      )}
    </button>
  );
}
