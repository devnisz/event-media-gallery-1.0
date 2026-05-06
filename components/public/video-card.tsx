"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type MouseEvent } from "react";
import type { EventVideo } from "@/types/video";
import { routes } from "@/lib/routes";
import { MediaBadge } from "./media-badge";
import { VideoThumbnail } from "./video-thumbnail";

type VideoCardProps = {
  video: EventVideo;
  index: number;
  isRemoving?: boolean;
  onDeleted?: (id: string) => void;
  /** Vista 2 colunas no celular: espaços, raios e título reduzidos (só abaixo de `md`). */
  compactMobileTwoCol?: boolean;
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
  isRemoving = false,
  onDeleted,
  compactMobileTwoCol = false,
}: VideoCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleDelete(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const confirmed = window.confirm(
      `Excluir "${video.title}"?\n\nA mídia, miniaturas, QR code e registro serão removidos.`,
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/videos/${encodeURIComponent(video.id)}`,
        {
          method: "DELETE",
        },
      );
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Nao foi possivel excluir a midia.");
      }

      onDeleted?.(video.id);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel excluir a midia.";

      setErrorMessage(message);
      window.alert(message);
    } finally {
      setIsDeleting(false);
    }
  }

  const c = compactMobileTwoCol;

  return (
    <article
      className={`group relative min-w-0 animate-rise overflow-hidden rounded-[2.35rem] border border-white/10 bg-white/[0.06] p-3 shadow-[0_28px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl transition duration-500 hover:-translate-y-2 hover:border-white/25 hover:bg-white/[0.1] ${
        c ? "max-md:rounded-xl max-md:p-1.5 max-md:shadow-[0_12px_36px_rgba(0,0,0,0.35)] max-md:hover:translate-y-0" : ""
      } ${
        isRemoving
          ? "scale-95 opacity-0 blur-sm"
          : "scale-100 opacity-100 blur-0"
      }`}
      style={{ animationDelay: `${index * 70}ms` }}
    >
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

      <Link
        href={routes.video(video.id)}
        className={`relative block rounded-[2rem] outline-none transition duration-300 focus-visible:ring-4 focus-visible:ring-amber-300/40 active:scale-[0.98] ${
          c ? "max-md:rounded-lg" : ""
        }`}
      >
        <div
          className={`pointer-events-none absolute left-6 top-6 z-10 ${
            c ? "max-md:left-1.5 max-md:top-1.5" : ""
          }`}
        >
          <MediaBadge kind={video.mediaType} />
        </div>
        <VideoThumbnail video={video} variant="vertical" />
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 rounded-b-[2rem] bg-gradient-to-t from-black/88 via-black/58 to-transparent px-5 pb-5 pt-24 ${
            c ? "max-md:rounded-b-lg max-md:px-1.5 max-md:pb-1.5 max-md:pt-10" : ""
          }`}
        >
          <div className={`min-w-0 pr-16 ${c ? "max-md:pr-7" : ""}`}>
            <p
              className={`mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-200/85 ${
                c ? "max-md:mb-0.5 max-md:text-[0.5rem] max-md:tracking-[0.12em]" : ""
              }`}
            >
              {video.event}
            </p>
            <h2
              className={`overflow-hidden text-2xl font-semibold leading-[1.05] tracking-tight text-white [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] md:text-[1.7rem] ${
                c
                  ? "max-md:line-clamp-1 max-md:text-[0.7rem] max-md:font-medium max-md:leading-snug md:text-[1.7rem]"
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
          <p
            className={`mt-4 text-sm font-medium text-white/58 ${
              c ? "max-md:mt-1 max-md:hidden" : ""
            }`}
          >
            Toque para ampliar e compartilhar
          </p>
        </div>
      </Link>
    </article>
  );
}
