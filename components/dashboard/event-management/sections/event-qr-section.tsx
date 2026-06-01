"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Download, Link2 } from "lucide-react";

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
          width: 420,
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
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-200">
          Compartilhamento
        </p>
        <h2 className="text-2xl font-black tracking-tight text-white">
          QR Code do evento
        </h2>
        <p className="max-w-xl text-sm text-white/45">
          Use o QR Code para levar convidados direto à galeria pública.
        </p>
      </div>

      <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
        <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-start">
          <div className="rounded-[1.5rem] bg-white p-4 shadow-inner">
            {previewSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewSrc}
                alt={`QR Code da galeria ${eventName}`}
                width={420}
                height={420}
                className="size-56 rounded-xl object-contain sm:size-64 lg:size-72"
              />
            ) : (
              <div
                className="flex size-56 items-center justify-center rounded-xl bg-white/90 sm:size-64 lg:size-72"
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

          <div className="w-full min-w-0 space-y-5 text-center lg:text-left">
            <div>
              <p className="text-lg font-semibold text-white">{eventName}</p>
              <p
                className="mt-2 break-all font-mono text-sm text-white/55"
                title={publicUrl}
              >
                {shortUrl}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
              <button
                type="button"
                onClick={() => void downloadFormat("png")}
                disabled={!previewSrc || isDownloading !== null}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 text-sm font-bold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="size-4" />
                {isDownloading === "png" ? "Gerando…" : "Baixar PNG"}
              </button>
              <button
                type="button"
                onClick={() => void downloadFormat("jpg")}
                disabled={!previewSrc || isDownloading !== null}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 text-sm font-bold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="size-4" />
                {isDownloading === "jpg" ? "Gerando…" : "Baixar JPG"}
              </button>
              <CopyPublicLinkButton value={publicUrl} />
            </div>

            <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-left">
              <div className="flex items-start gap-3">
                <Link2 className="mt-0.5 size-4 shrink-0 text-white/45" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white/70">Link público</p>
                  <p className="mt-1 break-all font-mono text-xs text-amber-100 sm:text-sm">
                    {publicUrl}
                  </p>
                </div>
              </div>
            </div>

            {error ? (
              <p className="text-sm font-semibold text-red-300">{error}</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
