"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { EVENT_QR_PRINT_PX, shortenPublicUrl } from "@/lib/qr/event-qr";

type EventQrCardProps = {
  eventName: string;
  publicUrl: string;
};

function sanitizeDownloadName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "evento";
}

export function EventQrCard({ eventName, publicUrl }: EventQrCardProps) {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  const shortUrl = shortenPublicUrl(publicUrl);

  useEffect(() => {
    let cancelled = false;

    async function renderPreview() {
      setError("");

      try {
        const dataUrl = await QRCode.toDataURL(publicUrl, {
          width: 280,
          margin: 2,
          errorCorrectionLevel: "M",
          color: {
            dark: "#0f172a",
            light: "#ffffff",
          },
        });

        if (!cancelled) {
          setPreviewSrc(dataUrl);
        }
      } catch {
        if (!cancelled) {
          setError("Não foi possível gerar o QR Code.");
          setPreviewSrc(null);
        }
      }
    }

    void renderPreview();

    return () => {
      cancelled = true;
    };
  }, [publicUrl]);

  async function copyLink() {
    setCopyMessage("");

    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopyMessage("Link copiado.");
    } catch {
      setCopyMessage("Não foi possível copiar.");
    }

    window.setTimeout(() => setCopyMessage(""), 2500);
  }

  async function downloadPng() {
    setIsDownloading(true);
    setError("");

    try {
      const canvas = document.createElement("canvas");
      canvas.width = EVENT_QR_PRINT_PX;
      canvas.height = EVENT_QR_PRINT_PX;

      await QRCode.toCanvas(canvas, publicUrl, {
        width: EVENT_QR_PRINT_PX,
        margin: 2,
        errorCorrectionLevel: "M",
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((value) => resolve(value), "image/png");
      });

      if (!blob) {
        throw new Error("Falha ao exportar PNG.");
      }

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `qr-${sanitizeDownloadName(eventName)}.png`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setError("Não foi possível baixar o PNG.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-black/70 p-4 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:p-5">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-5">
        <div className="shrink-0 rounded-2xl bg-white p-2.5 shadow-inner">
          {previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewSrc}
              alt={`QR Code da galeria ${eventName}`}
              width={280}
              height={280}
              className="size-28 rounded-xl object-contain sm:size-32"
            />
          ) : (
            <div
              className="flex size-28 items-center justify-center rounded-xl bg-white/90 sm:size-32"
              aria-busy={!error}
            >
              {error ? (
                <span className="px-2 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  Erro
                </span>
              ) : (
                <span className="size-8 animate-pulse rounded-full bg-slate-200" />
              )}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200">
            QR Code do evento
          </p>
          <p className="mt-1 text-lg font-semibold text-white">{eventName}</p>
          <p
            className="mt-1 break-all font-mono text-sm text-white/55 sm:truncate"
            title={publicUrl}
          >
            {shortUrl}
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <button
              type="button"
              onClick={() => void downloadPng()}
              disabled={!previewSrc || isDownloading}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDownloading ? "Gerando…" : "⬇ Baixar PNG"}
            </button>
            <button
              type="button"
              onClick={() => void copyLink()}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-white px-4 text-sm font-black text-slate-950 transition hover:bg-amber-100"
            >
              📋 Copiar Link
            </button>
          </div>

          {copyMessage ? (
            <p className="mt-2 text-sm font-semibold text-emerald-200" role="status">
              {copyMessage}
            </p>
          ) : null}
          {error ? (
            <p className="mt-2 text-sm font-semibold text-red-300">{error}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
