"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";

import { CopyPublicLinkButton } from "@/components/dashboard/copy-public-link-button";
import { EVENT_QR_PRINT_PX, shortenPublicUrl } from "@/lib/qr/event-qr";

type EventQrSectionProps = {
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

async function renderQrCanvas(publicUrl: string, size: number): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  await QRCode.toCanvas(canvas, publicUrl, {
    width: size,
    margin: 2,
    errorCorrectionLevel: "M",
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });

  return canvas;
}

export function EventQrSection({ eventName, publicUrl }: EventQrSectionProps) {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isDownloading, setIsDownloading] = useState<"png" | "jpg" | null>(null);

  const shortUrl = shortenPublicUrl(publicUrl);
  const downloadBase = `qr-${sanitizeDownloadName(eventName)}`;

  useEffect(() => {
    let cancelled = false;

    async function renderPreview() {
      setError("");

      try {
        const dataUrl = await QRCode.toDataURL(publicUrl, {
          width: 480,
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

  async function downloadFormat(format: "png" | "jpg") {
    setIsDownloading(format);
    setError("");

    try {
      const canvas = await renderQrCanvas(publicUrl, EVENT_QR_PRINT_PX);
      const mime = format === "png" ? "image/png" : "image/jpeg";

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((value) => resolve(value), mime, format === "jpg" ? 0.92 : undefined);
      });

      if (!blob) {
        throw new Error(`Falha ao exportar ${format.toUpperCase()}.`);
      }

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `${downloadBase}.${format}`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setError(`Não foi possível baixar o ${format.toUpperCase()}.`);
    } finally {
      setIsDownloading(null);
    }
  }

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-200/90">
          Compartilhamento
        </p>
        <h2 className="text-xl font-black tracking-tight text-white">
          QR Code do evento
        </h2>
        <p className="max-w-lg text-sm text-white/45">
          Imprima ou compartilhe para levar convidados à galeria pública.
        </p>
      </div>

      <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-6 sm:px-6">
        <div className="flex flex-col items-center">
          <div className="rounded-2xl bg-white p-3 shadow-inner">
            {previewSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewSrc}
                alt={`QR Code da galeria ${eventName}`}
                width={480}
                height={480}
                className="size-52 rounded-lg object-contain sm:size-60"
              />
            ) : (
              <div
                className="flex size-52 items-center justify-center rounded-lg bg-white/90 sm:size-60"
                aria-busy={!error}
              >
                {error ? (
                  <span className="px-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Erro
                  </span>
                ) : (
                  <span className="size-10 animate-pulse rounded-full bg-slate-200" />
                )}
              </div>
            )}
          </div>

          <div className="mt-5 flex w-full flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => void downloadFormat("png")}
              disabled={!previewSrc || isDownloading !== null}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:min-w-[7rem]"
            >
              <Download className="size-3.5" />
              {isDownloading === "png" ? "…" : "PNG"}
            </button>
            <button
              type="button"
              onClick={() => void downloadFormat("jpg")}
              disabled={!previewSrc || isDownloading !== null}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:min-w-[7rem]"
            >
              <Download className="size-3.5" />
              {isDownloading === "jpg" ? "…" : "JPG"}
            </button>
            <CopyPublicLinkButton
              value={publicUrl}
              label="Copiar link"
              compact
            />
          </div>

          <p
            className="mt-4 max-w-full truncate text-center text-xs text-white/35"
            title={publicUrl}
          >
            {shortUrl}
          </p>

          {error ? (
            <p className="mt-3 text-sm font-semibold text-red-300">{error}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
