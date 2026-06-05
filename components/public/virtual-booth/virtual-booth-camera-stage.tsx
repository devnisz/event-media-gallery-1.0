"use client";

import { Camera, Repeat2, Square, Video, X } from "lucide-react";
import type { RefObject } from "react";
import { cn } from "@/lib/utils";
import { VideoRecordingProgressRing } from "./video-recording-progress-ring";
import {
  boothPrimaryButtonClass,
  boothSecondaryButtonClass,
} from "./virtual-booth-ui";

type CaptureMode = "photo" | "boomerang" | "video";

type VirtualBoothCameraStageProps = {
  titleId: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  captureMode: CaptureMode;
  step: "camera" | "countdown";
  cameraReady: boolean;
  isRecordingMotion: boolean;
  countdownDisplay: string;
  countdownPhase: "prepare" | "tick" | "snap";
  flashVisible: boolean;
  videoRecordingProgress: number;
  composingMessage: string;
  errorMessage: string;
  videoMaxDurationSeconds: number;
  /** Aviso quando o vídeo será gravado sem áudio (microfone negado). */
  audioNotice?: string | null;
  onCameraReady: () => void;
  onClose: () => void;
  onPrimaryAction: () => void;
  onFinishVideoRecording: () => void;
};

export function VirtualBoothCameraStage({
  titleId,
  videoRef,
  captureMode,
  step,
  cameraReady,
  isRecordingMotion,
  countdownDisplay,
  countdownPhase,
  flashVisible,
  videoRecordingProgress,
  composingMessage,
  errorMessage,
  videoMaxDurationSeconds,
  audioNotice = null,
  onCameraReady,
  onClose,
  onPrimaryAction,
  onFinishVideoRecording,
}: VirtualBoothCameraStageProps) {
  const isVideoMode = captureMode === "video";
  const isBoomerangMode = captureMode === "boomerang";
  const showCountdown = step === "countdown" && !isRecordingMotion && !isVideoMode;

  const hint =
    step === "countdown"
      ? isBoomerangMode
        ? "A gravação começa após a contagem"
        : "A captura acontece após a contagem"
      : isVideoMode
        ? `Até ${videoMaxDurationSeconds}s · toque para gravar`
        : isBoomerangMode
          ? "Enquadre-se e toque em gravar"
          : "Enquadre-se e toque em capturar";

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-black">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          onCanPlay={onCameraReady}
          className="absolute inset-0 h-full w-full scale-x-[-1] object-cover"
          aria-labelledby={titleId}
        />

        {!cameraReady ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40">
            <div className="flex flex-col items-center gap-3">
              <div className="size-9 animate-pulse rounded-full border-2 border-white/30 border-t-white" />
              <p className="text-sm font-medium text-white/70">
                Iniciando câmera...
              </p>
            </div>
          </div>
        ) : null}

        {showCountdown ? (
          <div
            className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center px-6"
            aria-live="polite"
          >
            {countdownPhase === "prepare" ? (
              <p className="max-w-xs text-center text-xs font-medium tracking-[0.2em] text-white/75 uppercase drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]">
                {isBoomerangMode ? "Prepare-se" : "Prepare-se"}
              </p>
            ) : (
              <p
                key={countdownDisplay}
                className="animate-count-pop text-[5.5rem] font-semibold leading-none tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.75)] sm:text-[7rem]"
              >
                {countdownDisplay}
              </p>
            )}
          </div>
        ) : null}

        {isRecordingMotion && isVideoMode ? (
          <div className="pointer-events-none absolute inset-x-0 top-8 z-30 flex justify-center">
            <div className="relative grid place-items-center">
              <VideoRecordingProgressRing
                progress={videoRecordingProgress}
                size={88}
                strokeWidth={4}
              />
              <span className="absolute flex items-center gap-1.5 text-[0.65rem] font-semibold tracking-wide text-white uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                <span className="size-2 rounded-full bg-red-500" aria-hidden />
                Gravando
              </span>
            </div>
          </div>
        ) : null}

        {isRecordingMotion && isBoomerangMode ? (
          <div className="pointer-events-none absolute inset-x-0 top-6 z-30 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-black/45 px-4 py-2 text-sm font-medium text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
              <span className="size-2 animate-pulse rounded-full bg-white" />
              {composingMessage || "Gravando Boomerang..."}
            </span>
          </div>
        ) : null}

        {flashVisible ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-40 bg-white/90 transition-opacity duration-150"
          />
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-50 grid size-11 place-items-center rounded-full bg-black/40 text-white/90 transition hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          aria-label="Fechar"
        >
          <X className="size-5" strokeWidth={1.75} />
        </button>

        <p
          id={titleId}
          className="sr-only"
        >
          {isVideoMode
            ? "Gravação de vídeo"
            : isBoomerangMode
              ? "Gravação de Boomerang"
              : "Captura de foto"}
        </p>
      </div>

      <div className="relative z-40 shrink-0 border-t border-white/[0.06] bg-neutral-950/95 px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {audioNotice && isVideoMode ? (
          <p
            role="status"
            className="mb-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.08] px-3 py-2.5 text-center text-xs leading-relaxed text-amber-100/90"
          >
            {audioNotice}
          </p>
        ) : null}

        <p className="mb-4 text-center text-xs text-white/45">{hint}</p>

        {errorMessage ? (
          <p
            role="alert"
            className="mb-4 text-center text-sm font-medium text-red-300"
          >
            {errorMessage}
          </p>
        ) : null}

        {step === "camera" && !isRecordingMotion ? (
          <button
            type="button"
            onClick={onPrimaryAction}
            disabled={!cameraReady}
            className={cn(
              boothPrimaryButtonClass(),
              "gap-2.5",
            )}
          >
            {isVideoMode ? (
              <Video className="size-5" strokeWidth={1.75} />
            ) : isBoomerangMode ? (
              <Repeat2 className="size-5" strokeWidth={1.75} />
            ) : (
              <Camera className="size-5" strokeWidth={1.75} />
            )}
            {isVideoMode
              ? "Gravar vídeo"
              : isBoomerangMode
                ? "Gravar Boomerang"
                : "Capturar"}
          </button>
        ) : null}

        {step === "camera" && isRecordingMotion && isVideoMode ? (
          <button
            type="button"
            onClick={onFinishVideoRecording}
            className={cn(boothSecondaryButtonClass(), "gap-2.5")}
          >
            <Square className="size-4 fill-current" strokeWidth={1.75} />
            Finalizar gravação
          </button>
        ) : null}
      </div>
    </div>
  );
}
