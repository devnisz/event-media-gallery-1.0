"use client";

import {
  boothGhostButtonClass,
  boothPrimaryButtonClass,
  boothShellClass,
  boothSubtitleClass,
  boothTitleClass,
} from "./virtual-booth-ui";

type FlowVariant = "no-camera" | "composing" | "uploading" | "success";

type VirtualBoothFlowStatusProps = {
  titleId: string;
  variant: FlowVariant;
  isBoomerangMode: boolean;
  isVideoMode: boolean;
  message?: string;
  uploadProgress?: number;
  errorMessage?: string;
  onClose: () => void;
  onBack?: () => void;
};

export function VirtualBoothFlowStatus({
  titleId,
  variant,
  isBoomerangMode,
  isVideoMode,
  message,
  uploadProgress = 0,
  errorMessage,
  onClose,
  onBack,
}: VirtualBoothFlowStatusProps) {
  const title =
    variant === "no-camera"
      ? "Câmera indisponível"
      : variant === "composing"
        ? isBoomerangMode
          ? "Preparando Boomerang"
          : "Preparando foto"
        : variant === "uploading"
          ? isBoomerangMode
            ? "Publicando Boomerang"
            : isVideoMode
              ? "Publicando vídeo"
              : "Publicando foto"
          : isBoomerangMode
            ? "Boomerang publicado"
            : isVideoMode
              ? "Vídeo publicado"
              : "Foto publicada";

  const subtitle =
    variant === "no-camera"
      ? errorMessage ||
        "Captura disponível apenas em dispositivos com câmera."
      : variant === "composing"
        ? message || "Ajustando detalhes..."
        : variant === "uploading"
          ? message || "Enviando para a galeria..."
          : isBoomerangMode
            ? "Já está na galeria do evento."
            : isVideoMode
              ? "Já está na galeria do evento."
              : "Já está na galeria do evento.";

  return (
    <div className={boothShellClass}>
      {variant !== "uploading" && variant !== "composing" ? (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))] z-20 grid size-10 place-items-center rounded-full border border-white/[0.08] bg-white/[0.03] text-lg text-white/55 transition hover:border-white/15 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
          aria-label="Fechar"
        >
          ×
        </button>
      ) : null}

      <div className="mx-auto flex h-[100dvh] w-full max-w-[24rem] flex-col items-center justify-center text-center sm:max-w-[26rem]">
        <header className="w-full px-2">
          <h2 id={titleId} className={boothTitleClass}>
            {title}
          </h2>
          <p className={boothSubtitleClass}>{subtitle}</p>
        </header>

        {variant === "composing" || variant === "uploading" ? (
          <div className="mt-8 w-full max-w-xs px-2">
            <div className="h-1 overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-white/75 transition-all duration-300"
                style={{
                  width: `${
                    variant === "uploading"
                      ? Math.max(uploadProgress, 8)
                      : 66
                  }%`,
                }}
              />
            </div>
          </div>
        ) : null}

        {variant === "success" ? (
          <button
            type="button"
            onClick={onClose}
            className={`${boothPrimaryButtonClass()} mt-10 max-w-xs`}
          >
            Fechar
          </button>
        ) : null}

        {variant === "no-camera" && onBack ? (
          <button
            type="button"
            onClick={onBack}
            className={`${boothGhostButtonClass()} mt-8 max-w-xs`}
          >
            Voltar
          </button>
        ) : null}
      </div>
    </div>
  );
}
