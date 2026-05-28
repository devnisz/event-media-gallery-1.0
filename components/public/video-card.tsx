"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type MouseEvent } from "react";
import type { EventVideo } from "@/types/video";
import { routes } from "@/lib/routes";
import { MediaBadge } from "./media-badge";
import { VideoThumbnail } from "./video-thumbnail";

type VideoCardProps = {
  video: EventVideo;
  index: number;
  isNew?: boolean;
  isRemoving?: boolean;
  onDeleted?: (id: string) => void;
  /** Vista 2 colunas no celular: espaços, raios e título reduzidos (só abaixo de `md`). */
  compactMobileTwoCol?: boolean;
  allowPublicDelete?: boolean;
  requireDeletePin?: boolean;
  hideEventLabel?: boolean;
};

/** Mostra ~10% dos caracteres do título (+ reticências) para caber em grelha compacta. */
function shortTitleForCompact(title: string): string {
  const t = title.trim();
  if (t.length <= 6) {
    return t;
  }
  const n = Math.max(4, Math.ceil(t.length * 0.1));
  return `${t.slice(0, n).trimEnd()}…`;
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M9.5 6.5V5.2c0-.9.7-1.6 1.6-1.6h1.8c.9 0 1.6.7 1.6 1.6v1.3" />
      <path d="M5.8 6.5h12.4" />
      <path d="m8 9 .6 9.1c.1 1.1 1 1.9 2.1 1.9h2.6c1.1 0 2-.8 2.1-1.9L16 9" />
      <path d="M10.8 10.8v6.4" />
      <path d="M13.2 10.8v6.4" />
    </svg>
  );
}

export function VideoCard({
  video,
  index,
  isNew = false,
  isRemoving = false,
  onDeleted,
  compactMobileTwoCol = false,
  allowPublicDelete = false,
  requireDeletePin = false,
  hideEventLabel = false,
}: VideoCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [deletePin, setDeletePin] = useState("");

  async function deleteWithPin(pin: string) {
    const confirmed = window.confirm(
      `Excluir "${video.title}" da galeria?\n\nA mídia será removida da experiência pública do evento.`,
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/media/${encodeURIComponent(video.id)}/public-delete`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin }),
        },
      );
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível excluir a mídia.");
      }

      onDeleted?.(video.id);
      setPinDialogOpen(false);
      setDeletePin("");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível excluir a mídia.";

      setErrorMessage(message);
    } finally {
      setIsDeleting(false);
    }
  }

  function handleDelete(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const mustAskPin = requireDeletePin || video.requireDeletePin;

    if (mustAskPin) {
      setErrorMessage("");
      setDeletePin("");
      setPinDialogOpen(true);
      return;
    }

    void deleteWithPin("");
  }

  function submitPinDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();

    const pin = deletePin.trim();

    if (!/^\d{4,8}$/.test(pin)) {
      setErrorMessage("Informe um PIN de 4 a 8 dígitos.");
      return;
    }

    void deleteWithPin(pin);
  }

  const c = compactMobileTwoCol;
  const canPublicDelete = allowPublicDelete || video.allowPublicDelete;

  return (
    <article
      className={`group relative min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-2 shadow-[0_20px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl transition duration-500 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.07] hover:shadow-[0_28px_80px_rgba(0,0,0,0.4)] md:rounded-[1.75rem] md:p-2.5 ${
        isNew ? "animate-slide-in-media animate-glow-new border-fuchsia-400/40" : "animate-rise"
      } ${
        c ? "max-md:rounded-xl max-md:p-1.5 max-md:shadow-[0_12px_36px_rgba(0,0,0,0.35)] max-md:hover:translate-y-0" : ""
      } ${
        isRemoving
          ? "scale-95 opacity-0 blur-sm"
          : "scale-100 opacity-100 blur-0"
      }`}
      style={{ animationDelay: isNew ? undefined : `${index * 50}ms` }}
    >
      {canPublicDelete ? (
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting || isRemoving}
          className={`absolute right-6 top-6 z-20 grid size-12 place-items-center rounded-full border border-white/15 bg-black/55 text-white/85 shadow-2xl backdrop-blur-xl transition duration-300 hover:scale-105 hover:border-red-200/50 hover:bg-red-500/25 hover:text-red-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-300/35 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 max-md:[&_svg]:size-3.5 ${
            c ? "max-md:right-1.5 max-md:top-1.5 max-md:size-8 max-md:hover:scale-100" : ""
          }`}
          aria-label={`Excluir ${video.title}`}
        >
          {isDeleting ? (
            <span className="size-5 max-md:size-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          ) : (
            <TrashIcon />
          )}
        </button>
      ) : null}

      <Link
        href={routes.video(video.id)}
        className={`relative block rounded-[2rem] outline-none transition duration-300 focus-visible:ring-4 focus-visible:ring-amber-300/40 active:scale-[0.98] ${
          c ? "max-md:rounded-lg" : ""
        }`}
      >
        <div
          className={`pointer-events-none absolute left-4 top-4 z-10 flex flex-col gap-2 ${
            c ? "max-md:left-1.5 max-md:top-1.5" : ""
          }`}
        >
          <MediaBadge kind={video.mediaType} />
          {isNew ? (
            <span className="w-fit rounded-full bg-gradient-to-r from-fuchsia-500 to-amber-400 px-2 py-0.5 text-[0.55rem] font-black uppercase tracking-wider text-slate-950 shadow-lg">
              Novo
            </span>
          ) : null}
        </div>
        <VideoThumbnail video={video} variant="vertical" />
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 rounded-b-[1.5rem] bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-4 pt-16 md:rounded-b-[1.65rem] ${
            c ? "max-md:rounded-b-lg max-md:px-1.5 max-md:pb-1.5 max-md:pt-10" : ""
          }`}
        >
          <div className={`min-w-0 pr-12 ${c ? "max-md:pr-7" : ""}`}>
            {!hideEventLabel ? (
              <p
                className={`mb-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-amber-200/80 ${
                  c ? "max-md:mb-0.5 max-md:text-[0.5rem] max-md:tracking-[0.12em]" : ""
                }`}
              >
                {video.event}
              </p>
            ) : null}
            <h2
              className={`overflow-hidden text-base font-semibold leading-tight tracking-tight text-white [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] md:text-lg ${
                c
                  ? "max-md:line-clamp-1 max-md:text-[0.7rem] max-md:font-medium md:text-lg"
                  : ""
              }`}
            >
              <span className="md:hidden">
                {c ? shortTitleForCompact(video.title) : video.title}
              </span>
              <span className="hidden md:inline">{video.title}</span>
            </h2>
            {errorMessage ? (
              <p
                className={`mt-3 text-sm font-semibold leading-5 text-red-200 ${
                  c ? "max-md:mt-1 max-md:text-[0.65rem]" : ""
                }`}
              >
                {errorMessage}
              </p>
            ) : null}
          </div>
        </div>
      </Link>

      {pinDialogOpen ? (
        <div
          className="fixed inset-0 z-[90] grid place-items-center bg-black/70 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`PIN para excluir ${video.title}`}
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <form
            onSubmit={submitPinDelete}
            className="w-full max-w-sm rounded-[2rem] border border-white/12 bg-slate-950 p-6 text-white shadow-[0_28px_90px_rgba(0,0,0,0.55)]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200">
              Confirmação necessária
            </p>
            <h3 className="mt-3 text-2xl font-black">Informe o PIN</h3>
            <p className="mt-2 text-sm leading-6 text-white/55">
              Este evento exige PIN para excluir mídias da galeria pública.
            </p>
            <input
              autoFocus
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              minLength={4}
              maxLength={8}
              value={deletePin}
              disabled={isDeleting}
              onChange={(event) => setDeletePin(event.target.value)}
              placeholder="4 a 8 dígitos"
              className="mt-5 min-h-12 w-full rounded-2xl border border-white/12 bg-black/40 px-4 text-lg font-semibold outline-none ring-amber-300/30 placeholder:text-white/35 focus:ring-4 disabled:opacity-60"
            />
            {errorMessage ? (
              <p className="mt-3 text-sm font-semibold text-red-200">
                {errorMessage}
              </p>
            ) : null}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setPinDialogOpen(false);
                  setDeletePin("");
                  setErrorMessage("");
                }}
                className="flex-1 rounded-full border border-white/15 py-3 text-sm font-semibold text-white/75 hover:bg-white/10 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isDeleting}
                className="flex-1 rounded-full bg-red-500 py-3 text-sm font-black text-white shadow-lg hover:bg-red-400 disabled:opacity-50"
              >
                {isDeleting ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </article>
  );
}
