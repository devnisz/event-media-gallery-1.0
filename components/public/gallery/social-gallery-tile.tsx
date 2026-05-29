"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type MouseEvent } from "react";

import { routes } from "@/lib/routes";
import type { EventVideo } from "@/types/video";

type SocialGalleryTileProps = {
  video: EventVideo;
  isNew?: boolean;
  isRemoving?: boolean;
  allowPublicDelete?: boolean;
  requireDeletePin?: boolean;
  onDeleted?: (id: string) => void;
};

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-3.5"
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

function VideoPlayIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-3.5 text-white drop-shadow"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M8 5.14v13.72L19 12 8 5.14z" />
    </svg>
  );
}

export function SocialGalleryTile({
  video,
  isNew = false,
  isRemoving = false,
  allowPublicDelete = false,
  requireDeletePin = false,
  onDeleted,
}: SocialGalleryTileProps) {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [deletePin, setDeletePin] = useState("");

  const thumb =
    video.thumbnailUrl ??
    video.thumbnail ??
    (video.mediaType !== "video" ? video.url : undefined);
  const canPublicDelete = allowPublicDelete || video.allowPublicDelete;

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

  return (
    <article
      className={`group relative aspect-square min-w-0 overflow-hidden bg-black/50 transition duration-300 ${
        isNew ? "animate-gallery-fade-in" : ""
      } ${isRemoving ? "scale-[0.98] opacity-0" : "scale-100 opacity-100"}`}
    >
      {canPublicDelete ? (
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting || isRemoving}
          className="absolute right-1 top-1 z-20 grid size-7 place-items-center rounded-sm bg-black/55 text-white/85 opacity-0 transition hover:bg-red-500/80 hover:text-white focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/40 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`Excluir ${video.title}`}
        >
          {isDeleting ? (
            <span className="size-3 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          ) : (
            <TrashIcon />
          )}
        </button>
      ) : null}

      <Link
        href={routes.video(video.id)}
        className="relative block h-full w-full outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300/50"
        aria-label={video.title}
      >
        {!loaded && thumb ? (
          <div className="absolute inset-0 skeleton-shimmer" aria-hidden />
        ) : null}

        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            loading="lazy"
            onLoad={() => setLoaded(true)}
            className={`h-full w-full object-cover transition-opacity duration-500 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
        ) : (
          <div
            className={`h-full w-full bg-gradient-to-br ${video.accent}`}
            aria-hidden
          />
        )}

        {video.mediaType === "video" ? (
          <span className="pointer-events-none absolute bottom-1.5 left-1.5 opacity-90">
            <VideoPlayIcon />
          </span>
        ) : null}
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
