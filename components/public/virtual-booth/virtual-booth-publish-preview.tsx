"use client";

import {
  boothCloseButtonClass,
  boothPreviewFrameClass,
  boothPrimaryButtonClass,
  boothSecondaryButtonClass,
  boothShellClass,
  boothSubtitleClass,
  boothTitleClass,
} from "./virtual-booth-ui";
import { cn } from "@/lib/utils";

type VirtualBoothPublishPreviewProps = {
  titleId: string;
  isBoomerangMode: boolean;
  isVideoMode: boolean;
  isMotionMode: boolean;
  isVideoFromGallery: boolean;
  showingFramedVersion: boolean;
  hasOfficialFrame: boolean;
  composedFile: File | null;
  activePreviewUrl: string;
  errorMessage: string;
  onClose: () => void;
  onPublish: () => void;
  onReset: () => void;
  onToggleFrame: () => void;
  onChangeVideo: () => void;
};

export function VirtualBoothPublishPreview({
  titleId,
  isBoomerangMode,
  isVideoMode,
  isMotionMode,
  isVideoFromGallery,
  showingFramedVersion,
  hasOfficialFrame,
  composedFile,
  activePreviewUrl,
  errorMessage,
  onClose,
  onPublish,
  onReset,
  onToggleFrame,
  onChangeVideo,
}: VirtualBoothPublishPreviewProps) {
  const title = isBoomerangMode
    ? "Boomerang pronto"
    : isVideoMode
      ? "Vídeo pronto"
      : "Foto pronta";

  const subtitle = isBoomerangMode
    ? "Revise e publique na galeria"
    : isVideoMode
      ? "Revise e publique na galeria"
      : showingFramedVersion
        ? "Com moldura do evento"
        : "Pronta para publicar";

  const publishLabel = isBoomerangMode
    ? "Publicar Boomerang"
    : isVideoMode
      ? "Publicar vídeo"
      : "Publicar foto";

  const previewAlt = isBoomerangMode
    ? showingFramedVersion
      ? "Prévia do Boomerang com moldura"
      : "Prévia do Boomerang"
    : showingFramedVersion
      ? "Prévia final com moldura"
      : "Prévia da foto";

  return (
    <div className={cn(boothShellClass, "h-[100dvh]")}>
      <button
        type="button"
        onClick={onClose}
        className={boothCloseButtonClass}
        aria-label="Fechar"
      >
        ×
      </button>

      <div className="mx-auto flex min-h-0 flex-1 w-full max-w-[24rem] flex-col sm:max-w-[26rem]">
        <header className="shrink-0 pt-2 text-center sm:pt-4">
          <h2 id={titleId} className={boothTitleClass}>
            {title}
          </h2>
          <p className={boothSubtitleClass}>{subtitle}</p>
        </header>

        <div className="mt-4 flex min-h-0 flex-1 flex-col sm:mt-5">
          <div className={boothPreviewFrameClass}>
            {isVideoMode ? (
              <video
                src={activePreviewUrl}
                controls
                playsInline
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={activePreviewUrl}
                alt={previewAlt}
                className="max-h-full max-w-full object-contain"
              />
            )}
          </div>
        </div>

        <div className="mt-4 shrink-0 space-y-2 sm:mt-5">
          {errorMessage ? (
            <p
              role="alert"
              className="mb-1 text-center text-xs font-medium text-red-300/90"
            >
              {errorMessage}
            </p>
          ) : null}

          <button
            type="button"
            onClick={onPublish}
            className={boothPrimaryButtonClass()}
          >
            {publishLabel}
          </button>

          {isVideoMode && isVideoFromGallery ? (
            <button
              type="button"
              onClick={onChangeVideo}
              className={boothSecondaryButtonClass()}
            >
              Trocar vídeo
            </button>
          ) : isMotionMode || isVideoMode ? (
            <button
              type="button"
              onClick={onReset}
              className={boothSecondaryButtonClass()}
            >
              Refazer
            </button>
          ) : hasOfficialFrame && composedFile ? (
            <button
              type="button"
              onClick={onToggleFrame}
              className={boothSecondaryButtonClass()}
            >
              {showingFramedVersion ? "Sem moldura" : "Com moldura oficial"}
            </button>
          ) : !hasOfficialFrame ? (
            <button
              type="button"
              onClick={onReset}
              className={boothSecondaryButtonClass()}
            >
              Tirar outra foto
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
