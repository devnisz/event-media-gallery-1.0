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
import {
  boothCloseButtonClass,
  boothGhostButtonClass,
  boothShellClass,
  boothSubtitleClass,
  boothTitleClass,
} from "./virtual-booth-ui";

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
        "group flex w-full flex-col items-center justify-center gap-4 rounded-[1.125rem] border border-white/[0.07] bg-white/[0.025] px-3 py-8 transition-[transform,background-color,border-color] duration-200",
        "min-h-[9.25rem] touch-manipulation text-center sm:min-h-[10rem] sm:rounded-2xl sm:py-9",
        "hover:border-white/[0.11] hover:bg-white/[0.045] active:scale-[0.98] active:bg-white/[0.055]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950",
      )}
    >
      <span className="flex size-[3.5rem] items-center justify-center rounded-[1rem] bg-white/[0.045] text-white/90 transition-colors group-hover:bg-white/[0.075] sm:size-16 sm:rounded-[1.125rem]">
        <Icon className="size-7 sm:size-8" strokeWidth={1.35} aria-hidden />
      </span>
      <span className="block">
        <span className="block text-[0.9375rem] font-medium tracking-[-0.015em] text-white/90 sm:text-base">
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
    ? "absolute inset-0 z-50"
    : "fixed inset-0 z-[60]";

  return (
    <div className={overlayClass}>
      {/* Camada escurecida + blur no conteúdo anterior (iOS / Linear) */}
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-black/92 backdrop-blur-xl"
        onClick={onDismiss}
      />

      {/* Etapa opaca — sem transparência sobre a tela anterior */}
      <div className={cn(boothShellClass, "relative z-10 justify-center")}>
        <button
          type="button"
          onClick={onDismiss}
          className={boothCloseButtonClass}
          aria-label="Fechar"
        >
          <X className="size-4" strokeWidth={1.75} />
        </button>

        <div className="mx-auto flex w-full max-w-[24rem] flex-col items-center sm:max-w-[28rem]">
          <header className="w-full text-center">
            <h2 className={boothTitleClass}>{title}</h2>
            <p className={boothSubtitleClass}>{subtitle}</p>
          </header>

          <div className="mt-10 grid w-full gap-3.5 sm:mt-12 sm:gap-4">
            {showCamera ? (
              <SourceCard
                icon={isPhoto ? Camera : Video}
                title={isPhoto ? "Tirar foto" : "Gravar vídeo"}
                description={
                  isPhoto
                    ? "Use a câmera do dispositivo"
                    : "Grave agora com a câmera"
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
            className={cn(boothGhostButtonClass(), "mt-8")}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
