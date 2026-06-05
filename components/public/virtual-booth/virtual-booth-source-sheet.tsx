"use client";

import {
  Camera,
  FolderOpen,
  ImageIcon,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type VirtualBoothSourceSheetProps = {
  open: boolean;
  variant: "photo" | "video";
  showCamera: boolean;
  showGallery: boolean;
  /** Dentro do `<dialog>` — evita ficar atrás da top layer do modal nativo. */
  embedded?: boolean;
  onCamera: () => void;
  onGallery: () => void;
  onDismiss: () => void;
};

function SourceCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full flex-col items-center justify-center gap-4 rounded-[1.125rem] border border-white/[0.07] bg-white/[0.025] px-5 py-8 transition-[transform,background-color,border-color] duration-200",
        "min-h-[9.5rem] touch-manipulation text-center sm:min-h-[10rem] sm:rounded-2xl sm:py-9",
        "hover:border-white/[0.11] hover:bg-white/[0.045] active:scale-[0.98] active:bg-white/[0.055]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950",
      )}
    >
      <span className="flex size-[3.5rem] items-center justify-center rounded-[1rem] bg-white/[0.045] text-white/90 transition-colors group-hover:bg-white/[0.075] sm:size-16">
        <Icon className="size-7 sm:size-8" strokeWidth={1.35} aria-hidden />
      </span>
      <span className="block">
        <span className="block text-base font-medium tracking-[-0.015em] text-white/90">
          {title}
        </span>
        <span className="mt-1 block text-xs text-white/38">{description}</span>
      </span>
    </button>
  );
}

export function VirtualBoothSourceSheet({
  open,
  variant,
  showCamera,
  showGallery,
  embedded = false,
  onCamera,
  onGallery,
  onDismiss,
}: VirtualBoothSourceSheetProps) {
  if (!open || (!showCamera && !showGallery)) {
    return null;
  }

  const isPhoto = variant === "photo";
  const title = isPhoto ? "Adicionar foto" : "Adicionar vídeo";
  const subtitle = isPhoto
    ? "Como deseja criar sua foto?"
    : "Como deseja adicionar seu vídeo?";

  const overlayClass = embedded
    ? "absolute inset-0 z-50 flex items-center justify-center px-5 py-8"
    : "fixed inset-0 z-[60] flex items-center justify-center px-5 py-8 sm:px-6";

  return (
    <div className={overlayClass}>
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-black/70"
        onClick={onDismiss}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex w-full max-w-[22rem] flex-col sm:max-w-[24rem]"
      >
        <button
          type="button"
          onClick={onDismiss}
          className="absolute -right-1 -top-1 z-10 grid size-10 place-items-center rounded-full border border-white/[0.08] bg-neutral-900/90 text-white/60 transition hover:border-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 sm:right-0 sm:top-0"
          aria-label="Fechar"
        >
          <X className="size-4" strokeWidth={1.75} />
        </button>

        <header className="mb-8 pt-2 text-center sm:mb-10">
          <h2 className="text-[1.65rem] font-semibold tracking-[-0.03em] text-white sm:text-[1.75rem]">
            {title}
          </h2>
          <p className="mt-3 text-[0.9375rem] text-white/36">{subtitle}</p>
        </header>

        <div className="grid gap-3.5 sm:gap-4">
          {showCamera ? (
            <SourceCard
              icon={isPhoto ? Camera : Video}
              title={isPhoto ? "Tirar foto" : "Gravar vídeo"}
              description={
                isPhoto ? "Use a câmera do dispositivo" : "Grave agora com a câmera"
              }
              onClick={onCamera}
            />
          ) : null}
          {showGallery ? (
            <SourceCard
              icon={isPhoto ? ImageIcon : FolderOpen}
              title={isPhoto ? "Escolher da galeria" : "Escolher vídeo"}
              description={
                isPhoto
                  ? "Selecione uma foto existente"
                  : "Importe um vídeo do dispositivo"
              }
              onClick={onGallery}
            />
          ) : null}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-6 min-h-11 rounded-xl text-sm font-medium text-white/42 transition hover:text-white/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
