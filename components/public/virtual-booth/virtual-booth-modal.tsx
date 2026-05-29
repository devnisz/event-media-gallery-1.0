"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { uploadGuestMediaFile } from "@/lib/guest-upload/upload-client";
import { composePhotoWithFrame } from "@/lib/virtual-booth/apply-frame";
import {
  canCapturePhoto,
  capturePhotoFromVideo,
  startVirtualBoothPhotoStream,
  stopMediaStream,
} from "@/lib/virtual-booth/camera";
import {
  BOOMERANG_CAPTURE_DURATION_MS,
  BOOMERANG_CAPTURE_FPS,
  BOOMERANG_FILE_PREFIX,
  BOOMERANG_FRAME_DELAY_MS,
  BOOMERANG_GIF_QUALITY,
  BOOMERANG_MAX_LONG_EDGE,
  buildBoomerangSequence,
  MIN_VALID_BOOMERANG_FRAMES,
} from "@/lib/virtual-booth/boomerang";
import { captureGifFramesFromVideo } from "@/lib/virtual-booth/gif-capture";
import { processVirtualBoothGifFrames } from "@/lib/virtual-booth/generate-gif";
import { buildVirtualBoothMenuOptions } from "@/lib/virtual-booth/capture-options";
import type { CabineVirtualEventConfig } from "@/lib/virtual-booth/event-config";
import {
  ALWAYS_ON_GLAM_FILTER,
  applyGlamFilter,
} from "@/lib/virtual-booth/glam-filter";
import { recordVideoFromMediaStream } from "@/lib/virtual-booth/video-capture";

const BRAND_LABEL = "Cabine Virtual";

type CaptureMode = "photo" | "gif" | "boomerang" | "video";

type ModalStep =
  | "menu"
  | "no-camera"
  | "camera"
  | "countdown"
  | "composing"
  | "final-preview"
  | "uploading"
  | "success";

type VirtualBoothModalProps = {
  open: boolean;
  eventId?: string;
  allowGuestUpload: boolean;
  frameUrl?: string;
  cabineConfig: CabineVirtualEventConfig;
  onClose: () => void;
};

function revokeObjectUrl(url: string | null) {
  if (url) {
    URL.revokeObjectURL(url);
  }
}

function getCameraErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "Permita o acesso à câmera para usar a Cabine Virtual.";
    }

    if (error.name === "NotFoundError") {
      return "Nenhuma câmera foi encontrada neste dispositivo.";
    }
  }

  return error instanceof Error
    ? error.message
    : "Não foi possível iniciar a câmera.";
}

export function VirtualBoothModal({
  open,
  eventId,
  allowGuestUpload,
  frameUrl = "",
  cabineConfig,
  onClose,
}: VirtualBoothModalProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const countdownTimersRef = useRef<number[]>([]);
  const capturePreviewUrlRef = useRef<string | null>(null);
  const composedPreviewUrlRef = useRef<string | null>(null);
  const titleId = useId();
  const [step, setStep] = useState<ModalStep>("menu");
  const [captureMode, setCaptureMode] = useState<CaptureMode>("photo");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [countdownDisplay, setCountdownDisplay] = useState("");
  const [countdownPhase, setCountdownPhase] = useState<"prepare" | "tick" | "snap">(
    "prepare",
  );
  const [flashVisible, setFlashVisible] = useState(false);
  const [isRecordingMotion, setIsRecordingMotion] = useState(false);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [composedFile, setComposedFile] = useState<File | null>(null);
  const [capturePreviewUrl, setCapturePreviewUrl] = useState<string | null>(
    null,
  );
  const [composedPreviewUrl, setComposedPreviewUrl] = useState<string | null>(
    null,
  );
  const [useFramedPreview, setUseFramedPreview] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState("");
  const [composingMessage, setComposingMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const officialFrameUrl = frameUrl.trim();
  const hasOfficialFrame = officialFrameUrl.length > 0;
  const menuOptions = useMemo(
    () => buildVirtualBoothMenuOptions(cabineConfig),
    [cabineConfig],
  );
  const isGifMode = captureMode === "gif";
  const isBoomerangMode = captureMode === "boomerang";
  const isVideoMode = captureMode === "video";
  const isMotionMode = isGifMode || isBoomerangMode;
  const showingFramedVersion =
    hasOfficialFrame && useFramedPreview && Boolean(composedFile);

  const activePreviewUrl = showingFramedVersion
    ? composedPreviewUrl
    : capturePreviewUrl;

  const activePublishFile = showingFramedVersion
    ? composedFile
    : sourceFile;

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open) {
      dialog.showModal();
      return;
    }

    dialog.close();
  }, [open]);

  useEffect(() => {
    capturePreviewUrlRef.current = capturePreviewUrl;
  }, [capturePreviewUrl]);

  useEffect(() => {
    composedPreviewUrlRef.current = composedPreviewUrl;
  }, [composedPreviewUrl]);

  useEffect(() => {
    return () => {
      countdownTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      countdownTimersRef.current = [];
      stopMediaStream(cameraStreamRef.current);
      revokeObjectUrl(capturePreviewUrlRef.current);
      revokeObjectUrl(composedPreviewUrlRef.current);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;

    const keepVideoLive =
      step === "camera" || step === "countdown" || isRecordingMotion;

    if (!video || !cameraStream || !keepVideoLive) {
      return;
    }

    video.srcObject = cameraStream;
    void video.play();

    return () => {
      video.srcObject = null;
    };
  }, [cameraStream, step, isRecordingMotion]);

  function resetState() {
    countdownTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    countdownTimersRef.current = [];
    stopMediaStream(cameraStreamRef.current);
    cameraStreamRef.current = null;
    revokeObjectUrl(capturePreviewUrl);
    revokeObjectUrl(composedPreviewUrl);

    setStep("menu");
    setCaptureMode("photo");
    setCameraStream(null);
    setCameraReady(false);
    setCountdownDisplay("");
    setCountdownPhase("prepare");
    setFlashVisible(false);
    setIsRecordingMotion(false);
    setSourceFile(null);
    setComposedFile(null);
    setCapturePreviewUrl(null);
    setComposedPreviewUrl(null);
    setUseFramedPreview(true);
    setUploadProgress(0);
    setUploadMessage("");
    setComposingMessage("");
    setErrorMessage("");
  }

  function handleClose() {
    if (
      step === "uploading" ||
      step === "composing" ||
      step === "countdown" ||
      isRecordingMotion
    ) {
      return;
    }

    resetState();
    onClose();
  }

  async function startCameraCapture(mode: CaptureMode) {
    setErrorMessage("");
    setCaptureMode(mode);

    if (!allowGuestUpload || !eventId) {
      setErrorMessage("Este evento não permite envio de mídia na galeria.");
      return;
    }

    const canCapture = await canCapturePhoto();

    if (!canCapture) {
      setStep("no-camera");
      return;
    }

    setStep("camera");
    setCameraReady(false);

    try {
      const stream = await startVirtualBoothPhotoStream();
      cameraStreamRef.current = stream;
      setCameraStream(stream);
    } catch (error) {
      stopMediaStream(cameraStreamRef.current);
      cameraStreamRef.current = null;
      setCameraStream(null);
      setStep("no-camera");
      setErrorMessage(getCameraErrorMessage(error));
    }
  }

  function handleOptionClick(optionId: string) {
    setErrorMessage("");

    if (optionId === "photo") {
      void startCameraCapture("photo");
      return;
    }

    if (optionId === "gif") {
      void startCameraCapture("gif");
      return;
    }

    if (optionId === "boomerang") {
      void startCameraCapture("boomerang");
      return;
    }

    if (optionId === "video") {
      void startCameraCapture("video");
      return;
    }

    setErrorMessage("Este recurso não está disponível neste evento.");
  }

  async function captureVideoSequence() {
    const stream = cameraStreamRef.current;

    if (!stream) {
      setStep("camera");
      setErrorMessage("A câmera ainda não está pronta para gravar.");
      return;
    }

    setErrorMessage("");
    setIsRecordingMotion(true);
    setComposingMessage(
      `Gravando vídeo (0/${cabineConfig.videoMaxDurationSeconds}s)...`,
    );

    try {
      const recordedFile = await recordVideoFromMediaStream(
        stream,
        cabineConfig.videoMaxDurationSeconds,
        {
          onProgress: (elapsedSeconds, maxSeconds) => {
            setComposingMessage(
              `Gravando vídeo (${Math.min(
                maxSeconds,
                Math.ceil(elapsedSeconds),
              )}/${maxSeconds}s)...`,
            );
          },
        },
      );

      setIsRecordingMotion(false);
      stopMediaStream(cameraStreamRef.current);
      cameraStreamRef.current = null;
      setCameraStream(null);
      setCameraReady(false);

      revokeObjectUrl(capturePreviewUrl);
      revokeObjectUrl(composedPreviewUrl);

      setSourceFile(recordedFile);
      setCapturePreviewUrl(URL.createObjectURL(recordedFile));
      setComposedFile(null);
      setComposedPreviewUrl(null);
      setUseFramedPreview(false);
      setStep("final-preview");
    } catch (error) {
      setIsRecordingMotion(false);
      setStep("camera");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível gravar o vídeo. Tente novamente.",
      );
    }
  }

  async function applyOfficialFrameAutomatically(source: File) {
    setStep("composing");
    setComposingMessage("Aplicando a moldura oficial do evento...");
    setErrorMessage("");

    try {
      const framed = await composePhotoWithFrame(source, officialFrameUrl);

      revokeObjectUrl(composedPreviewUrl);

      setComposedFile(framed);
      setComposedPreviewUrl(URL.createObjectURL(framed));
      setUseFramedPreview(true);
      setStep("final-preview");
    } catch (error) {
      setComposedFile(null);
      revokeObjectUrl(composedPreviewUrl);
      setComposedPreviewUrl(null);
      setUseFramedPreview(false);
      setStep("final-preview");
      setErrorMessage(
        error instanceof Error
          ? `${error.message} Você ainda pode publicar sem moldura.`
          : "Não foi possível aplicar a moldura. Você ainda pode publicar sem moldura.",
      );
    }
  }

  async function prepareCapturedPhoto(file: File) {
    setStep("composing");
    setComposingMessage("Aplicando filtro Glam automático...");
    setErrorMessage("");
    revokeObjectUrl(capturePreviewUrl);
    revokeObjectUrl(composedPreviewUrl);

    let enhancedFile = file;

    try {
      enhancedFile = await applyGlamFilter(file, ALWAYS_ON_GLAM_FILTER);
    } catch {
      enhancedFile = file;
    }

    const nextCaptureUrl = URL.createObjectURL(enhancedFile);

    setSourceFile(enhancedFile);
    setCapturePreviewUrl(nextCaptureUrl);
    setComposedFile(null);
    setComposedPreviewUrl(null);
    setUseFramedPreview(true);
    setErrorMessage("");

    if (hasOfficialFrame) {
      await applyOfficialFrameAutomatically(enhancedFile);
      return;
    }

    setStep("final-preview");
  }

  async function captureCurrentFrame() {
    const video = videoRef.current;

    if (!video) {
      setStep("camera");
      setErrorMessage("A câmera ainda não está pronta para capturar.");
      return;
    }

    try {
      const capturedFile = await capturePhotoFromVideo(video, { mirror: true });
      stopMediaStream(cameraStreamRef.current);
      cameraStreamRef.current = null;
      setCameraStream(null);
      setCameraReady(false);
      await prepareCapturedPhoto(capturedFile);
    } catch (error) {
      setStep("camera");
      setFlashVisible(false);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível capturar a foto.",
      );
    }
  }

  async function captureMotionSequence() {
    const video = videoRef.current;

    if (!video) {
      setStep("camera");
      setErrorMessage("A câmera ainda não está pronta para capturar.");
      return;
    }

    setErrorMessage("");
    setIsRecordingMotion(true);
    setComposingMessage(
      isBoomerangMode ? "Capturando Boomerang..." : "Capturando movimento...",
    );

    try {
      const { frames: rawFrames, stats } = await captureGifFramesFromVideo(video, {
        mirror: true,
        durationMs: isBoomerangMode ? BOOMERANG_CAPTURE_DURATION_MS : undefined,
        fps: isBoomerangMode ? BOOMERANG_CAPTURE_FPS : undefined,
        maxLongEdge: isBoomerangMode ? BOOMERANG_MAX_LONG_EDGE : undefined,
        minValidFrames: isBoomerangMode ? MIN_VALID_BOOMERANG_FRAMES : undefined,
        logLabel: isBoomerangMode ? "Boomerang" : "GIF",
        onProgress: (frameIndex, totalFrames) => {
          setComposingMessage(
            isBoomerangMode
              ? `Capturando Boomerang (${frameIndex}/${totalFrames})...`
              : `Capturando movimento (${frameIndex}/${totalFrames})...`,
          );
        },
      });

      console.log(
        `[Cabine Virtual ${isBoomerangMode ? "Boomerang" : "GIF"}] resumo da captura no modal`,
        stats,
      );

      setIsRecordingMotion(false);
      stopMediaStream(cameraStreamRef.current);
      cameraStreamRef.current = null;
      setCameraStream(null);
      setCameraReady(false);

      setStep("composing");
      setComposingMessage(
        isBoomerangMode ? "Gerando Boomerang..." : "Gerando GIF...",
      );

      revokeObjectUrl(capturePreviewUrl);
      revokeObjectUrl(composedPreviewUrl);

      const sequenceFrames = isBoomerangMode
        ? buildBoomerangSequence(rawFrames)
        : rawFrames;

      console.log(
        `[Cabine Virtual ${isBoomerangMode ? "Boomerang" : "GIF"}] frames na sequência final`,
        {
          capturados: rawFrames.length,
          sequencia: sequenceFrames.length,
        },
      );

      const { glamGif, framedGif } = await processVirtualBoothGifFrames(
        sequenceFrames,
        {
          frameUrl: hasOfficialFrame ? officialFrameUrl : undefined,
          glamConfig: ALWAYS_ON_GLAM_FILTER,
          fileNamePrefix: isBoomerangMode
            ? BOOMERANG_FILE_PREFIX
            : "cabine-virtual",
          logLabel: isBoomerangMode ? "Boomerang" : "GIF",
          onStage: setComposingMessage,
          encodeOptions: isBoomerangMode
            ? {
                frameDelayMs: BOOMERANG_FRAME_DELAY_MS,
                quality: BOOMERANG_GIF_QUALITY,
                maxLongEdge: BOOMERANG_MAX_LONG_EDGE,
              }
            : undefined,
        },
      );

      setSourceFile(glamGif);
      setCapturePreviewUrl(URL.createObjectURL(glamGif));
      setComposedFile(framedGif);
      setComposedPreviewUrl(framedGif ? URL.createObjectURL(framedGif) : null);
      setUseFramedPreview(Boolean(framedGif));
      setStep("final-preview");

      if (!framedGif && hasOfficialFrame) {
        setErrorMessage(
          isBoomerangMode
            ? "Não foi possível aplicar a moldura. Você ainda pode publicar o Boomerang sem moldura."
            : "Não foi possível aplicar a moldura. Você ainda pode publicar o GIF sem moldura.",
        );
      }
    } catch (error) {
      setIsRecordingMotion(false);
      setStep("camera");
      setFlashVisible(false);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : isBoomerangMode
            ? "Não foi possível gerar o Boomerang. Tente novamente."
            : "Não foi possível gerar o GIF. Tente novamente.",
      );
    }
  }

  function startCountdown() {
    if (!cameraReady) {
      return;
    }

    countdownTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    countdownTimersRef.current = [];
    setErrorMessage("");
    setFlashVisible(false);
    setCountdownDisplay("");
    setCountdownPhase("prepare");
    setStep("countdown");

    const sequence = [
      { delay: 900, phase: "tick" as const, value: "3" },
      { delay: 1800, phase: "tick" as const, value: "2" },
      { delay: 2700, phase: "tick" as const, value: "1" },
      {
        delay: 3600,
        phase: "snap" as const,
        value: isBoomerangMode
          ? "🔄"
          : isGifMode
            ? "🎞️"
            : isVideoMode
              ? "🎥"
              : "📸",
      },
    ];

    sequence.forEach(({ delay, phase, value }) => {
      const timer = window.setTimeout(() => {
        setCountdownPhase(phase);
        setCountdownDisplay(value);
      }, delay);
      countdownTimersRef.current.push(timer);
    });

    countdownTimersRef.current.push(
      window.setTimeout(() => setFlashVisible(true), 3720),
      window.setTimeout(() => {
        if (isVideoMode) {
          void captureVideoSequence();
        } else if (isMotionMode) {
          void captureMotionSequence();
        } else {
          void captureCurrentFrame();
        }
      }, 3820),
      window.setTimeout(() => setFlashVisible(false), 4050),
    );
  }

  async function handlePublishMedia() {
    if (!activePublishFile || !eventId) {
      return;
    }

    setStep("uploading");
    setUploadProgress(0);
    setUploadMessage("Preparando upload...");
    setErrorMessage("");

    try {
      await uploadGuestMediaFile(eventId, activePublishFile, (update) => {
        setUploadProgress(update.progress);
        setUploadMessage(update.message);
      });

      router.refresh();
      setStep("success");
    } catch (error) {
      setStep("final-preview");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : isBoomerangMode
            ? "Não foi possível publicar o Boomerang."
            : isGifMode
              ? "Não foi possível publicar o GIF."
              : isVideoMode
                ? "Não foi possível publicar o vídeo."
                : "Não foi possível publicar a foto.",
      );
    }
  }

  return (
    <>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="w-[min(100%,28rem)] max-w-[calc(100vw-2rem)] rounded-[2rem] border border-white/12 bg-slate-950/95 p-0 text-white shadow-[0_40px_120px_rgba(0,0,0,0.65)] backdrop-blur-2xl open:animate-rise"
        onClose={handleClose}
        onClick={(event) => {
          if (
            event.target === dialogRef.current &&
            step !== "uploading" &&
            step !== "composing" &&
            step !== "countdown" &&
            !isRecordingMotion
          ) {
            handleClose();
          }
        }}
      >
        <div className="relative overflow-hidden rounded-[2rem]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.18),transparent_70%)]"
          />

          <div className="relative p-6 sm:p-8">
            {step !== "uploading" &&
            step !== "composing" &&
            step !== "countdown" &&
            !isRecordingMotion ? (
              <button
                type="button"
                onClick={handleClose}
                className="absolute right-5 top-5 grid size-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-lg text-white/60 transition hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/40"
                aria-label="Fechar"
              >
                ×
              </button>
            ) : null}

            {step === "menu" ? (
              <>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-200/90">
                  {BRAND_LABEL}
                </p>
                <h2
                  id={titleId}
                  className="mt-3 pr-10 text-2xl font-black tracking-tight sm:text-3xl"
                >
                  {BRAND_LABEL}
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/45">
                  Crie fotos, GIFs e Boomerangs personalizados com a moldura oficial do evento.
                </p>

                {errorMessage ? (
                  <p className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100">
                    {errorMessage}
                  </p>
                ) : null}

                <ul className="mt-6 space-y-3">
                  {menuOptions.map((option) => (
                    <li key={option.id}>
                      <button
                        type="button"
                        onClick={() => handleOptionClick(option.id)}
                        className="group flex w-full items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition duration-300 hover:border-white/20 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/40 active:scale-[0.99]"
                      >
                        <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/30 text-xl transition group-hover:scale-105">
                          {option.icon}
                        </span>
                        <span className="min-w-0 pt-0.5">
                          <span className="block text-base font-black text-white">
                            {option.title}
                          </span>
                          <span className="mt-1 block text-sm leading-5 text-white/50">
                            {option.description}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            {step === "no-camera" ? (
              <>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-200/90">
                  {BRAND_LABEL}
                </p>
                <h2
                  id={titleId}
                  className="mt-3 pr-10 text-2xl font-black tracking-tight sm:text-3xl"
                >
                  Foto indisponível
                </h2>
                <p className="mt-4 text-sm leading-7 text-white/55">
                  {errorMessage ||
                    "Captura de foto disponível apenas em dispositivos com câmera."}
                </p>
                <button
                  type="button"
                  onClick={() => setStep("menu")}
                  className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-bold text-white/80 transition hover:bg-white/10"
                >
                  Voltar
                </button>
              </>
            ) : null}

            {step === "camera" || step === "countdown" || isRecordingMotion ? (
              <>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-200/90">
                  {BRAND_LABEL}
                </p>
                <h2
                  id={titleId}
                  className="mt-3 pr-10 text-2xl font-black tracking-tight sm:text-3xl"
                >
                  {step === "countdown"
                    ? "Prepare-se"
                    : isBoomerangMode
                      ? "Enquadre seu Boomerang"
                      : isGifMode
                        ? "Enquadre seu GIF"
                        : isVideoMode
                          ? "Enquadre seu vídeo"
                          : "Enquadre sua foto"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/45">
                  {step === "countdown"
                    ? isBoomerangMode
                      ? "A gravação curta começa automaticamente após a contagem."
                      : isGifMode
                        ? "A gravação de 3 segundos começa automaticamente após a contagem."
                        : isVideoMode
                          ? `A gravação de até ${cabineConfig.videoMaxDurationSeconds} segundos começa após a contagem.`
                          : "A captura acontece automaticamente no final da contagem."
                    : isBoomerangMode
                      ? "Use boa luz, olhe para a câmera e toque em gravar."
                      : isGifMode
                        ? "Use boa luz, olhe para a câmera e toque em gravar."
                        : isVideoMode
                          ? "Use boa luz, olhe para a câmera e toque em gravar."
                          : "Use boa luz, olhe para a câmera e toque em capturar."}
                </p>

                <div className="relative mt-5 flex min-h-[min(52vh,30rem)] items-center justify-center overflow-hidden rounded-[1.75rem] border border-white/10 bg-black shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_20%,rgba(251,191,36,0.16),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.06),transparent_35%,rgba(0,0,0,0.28))]"
                  />
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    onCanPlay={() => setCameraReady(true)}
                    className="max-h-[min(58vh,34rem)] w-full scale-x-[-1] object-contain"
                  />

                  {!cameraReady ? (
                    <div className="absolute inset-0 z-20 grid place-items-center bg-slate-950/80 px-6 text-center">
                      <div>
                        <div className="mx-auto size-10 animate-pulse rounded-full border-2 border-amber-200/80 border-t-transparent" />
                        <p className="mt-4 text-sm font-semibold text-white/70">
                          Iniciando câmera...
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {isRecordingMotion ? (
                    <div className="absolute inset-0 z-30 grid place-items-center bg-black/25 px-6 text-center backdrop-blur-[1px]">
                      <div>
                        <div className="mx-auto size-10 animate-pulse rounded-full border-2 border-fuchsia-300/80 border-t-transparent" />
                        <p className="mt-4 text-sm font-semibold text-white/80">
                          {composingMessage ||
                            (isBoomerangMode
                              ? "Gravando Boomerang..."
                              : isVideoMode
                                ? "Gravando vídeo..."
                                : "Gravando GIF...")}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {step === "countdown" && !isRecordingMotion ? (
                    <div className="absolute inset-0 z-30 grid place-items-center bg-black/18 px-6 text-center backdrop-blur-[1px]">
                      <div className="relative flex flex-col items-center gap-4">
                        {countdownPhase === "prepare" ? (
                          <p className="max-w-[14rem] text-[0.7rem] font-medium leading-relaxed tracking-[0.18em] text-white/55 uppercase">
                            {isBoomerangMode
                              ? "Prepare-se para o Boomerang"
                              : isGifMode
                                ? "Prepare-se para o GIF"
                                : isVideoMode
                                  ? "Prepare-se para o vídeo"
                                  : "Prepare-se para a foto"}
                          </p>
                        ) : (
                          <>
                            <div
                              aria-hidden
                              className="absolute inset-0 -z-10 rounded-full bg-amber-200/20 blur-3xl"
                            />
                            <p
                              key={countdownDisplay}
                              className="animate-count-pop text-6xl font-black leading-none tracking-tight text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.65)] sm:text-8xl"
                            >
                              {countdownDisplay}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {flashVisible ? (
                    <div
                      aria-hidden
                      className="absolute inset-0 z-40 bg-white/95 transition-opacity duration-150"
                    />
                  ) : null}
                </div>

                {errorMessage ? (
                  <p className="mt-4 text-sm font-semibold text-red-200">
                    {errorMessage}
                  </p>
                ) : null}

                {step === "camera" && !isRecordingMotion ? (
                  <button
                    type="button"
                    onClick={startCountdown}
                    disabled={!cameraReady}
                    className="mt-6 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-300 via-orange-400 to-fuchsia-500 px-6 text-base font-black text-slate-950 shadow-[0_18px_60px_rgba(251,191,36,0.32)] transition hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    <span aria-hidden>
                      {isBoomerangMode
                        ? "🔄"
                        : isGifMode
                          ? "🎞️"
                          : isVideoMode
                            ? "🎥"
                            : "📸"}
                    </span>
                    {isBoomerangMode
                      ? "Gravar Boomerang"
                      : isGifMode
                        ? "Gravar GIF"
                        : isVideoMode
                          ? "Gravar vídeo"
                          : "Capturar"}
                  </button>
                ) : null}
              </>
            ) : null}

            {step === "composing" ? (
              <>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-200/90">
                  {BRAND_LABEL}
                </p>
                <h2
                  id={titleId}
                  className="mt-3 text-2xl font-black tracking-tight sm:text-3xl"
                >
                  {isBoomerangMode
                    ? "Preparando seu Boomerang"
                    : isGifMode
                      ? "Preparando seu GIF"
                      : "Preparando sua foto"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/45">
                  {composingMessage || "Ajustando detalhes da imagem..."}
                </p>
                <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-amber-300 to-fuchsia-400" />
                </div>
              </>
            ) : null}

            {step === "final-preview" && activePreviewUrl ? (
              <>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-200/90">
                  {BRAND_LABEL}
                </p>
                <h2
                  id={titleId}
                  className="mt-3 pr-10 text-2xl font-black tracking-tight sm:text-3xl"
                >
                  {isBoomerangMode
                    ? "Seu Boomerang está pronto!"
                    : isGifMode
                      ? "Seu GIF está pronto!"
                      : isVideoMode
                        ? "Seu vídeo está pronto!"
                        : "Sua foto está pronta!"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/45">
                  {isBoomerangMode
                    ? showingFramedVersion
                      ? "Boomerang animado com moldura oficial do evento."
                      : "Prévia do Boomerang pronto para publicar."
                    : isGifMode
                      ? showingFramedVersion
                        ? "GIF animado com moldura oficial do evento."
                        : "Prévia do GIF pronto para publicar."
                      : isVideoMode
                        ? "Prévia do vídeo pronto para publicar."
                        : showingFramedVersion
                          ? "Personalizada com a moldura oficial do evento."
                          : "Visualizando a foto sem moldura. Você pode voltar à versão oficial."}
                </p>

                <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                  {isVideoMode ? (
                    <video
                      src={activePreviewUrl}
                      controls
                      playsInline
                      className="max-h-[min(52vh,28rem)] w-full object-contain"
                    />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={activePreviewUrl}
                      alt={
                        isBoomerangMode
                          ? showingFramedVersion
                            ? "Prévia do Boomerang com moldura"
                            : "Prévia do Boomerang"
                          : isGifMode
                            ? showingFramedVersion
                              ? "Prévia do GIF com moldura"
                              : "Prévia do GIF"
                            : showingFramedVersion
                              ? "Prévia final com moldura"
                              : "Prévia da foto original"
                      }
                      className="max-h-[min(52vh,28rem)] w-full object-contain"
                    />
                  )}
                </div>

                {errorMessage ? (
                  <p className="mt-4 text-sm font-semibold text-red-200">
                    {errorMessage}
                  </p>
                ) : null}

                <div className="mt-6 space-y-3">
                  <button
                    type="button"
                    onClick={() => void handlePublishMedia()}
                    className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-300 via-orange-400 to-fuchsia-500 px-6 text-base font-black text-slate-950 shadow-[0_18px_60px_rgba(251,191,36,0.32)] transition hover:brightness-105 active:scale-[0.98]"
                  >
                    <span aria-hidden>✅</span>
                    {isBoomerangMode
                      ? "Publicar Boomerang"
                      : isGifMode
                        ? "Publicar GIF"
                        : isVideoMode
                          ? "Publicar vídeo"
                          : "Publicar foto"}
                  </button>

                  {isMotionMode || isVideoMode ? (
                    <button
                      type="button"
                      onClick={resetState}
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-white/10 px-5 text-sm font-semibold text-white/45 transition hover:border-white/15 hover:bg-white/[0.04] hover:text-white/70"
                    >
                      Refazer
                    </button>
                  ) : hasOfficialFrame && composedFile ? (
                    <button
                      type="button"
                      onClick={() => {
                        setUseFramedPreview((current) => !current);
                        setErrorMessage("");
                      }}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-transparent px-5 text-sm font-semibold text-white/45 transition hover:border-white/15 hover:bg-white/[0.04] hover:text-white/70"
                    >
                      <span aria-hidden>{showingFramedVersion ? "◻" : "🖼️"}</span>
                      {showingFramedVersion ? "Sem moldura" : "Com moldura oficial"}
                    </button>
                  ) : !hasOfficialFrame ? (
                    <button
                      type="button"
                      onClick={resetState}
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-white/10 px-5 text-sm font-semibold text-white/45 transition hover:border-white/15 hover:bg-white/[0.04] hover:text-white/70"
                    >
                      Tirar outra foto
                    </button>
                  ) : null}
                </div>
              </>
            ) : null}

            {step === "uploading" ? (
              <>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-200/90">
                  {BRAND_LABEL}
                </p>
                <h2
                  id={titleId}
                  className="mt-3 text-2xl font-black tracking-tight sm:text-3xl"
                >
                  {isBoomerangMode
                    ? "Publicando Boomerang"
                    : isGifMode
                      ? "Publicando GIF"
                      : isVideoMode
                        ? "Publicando vídeo"
                        : "Publicando foto"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/45">
                  {uploadMessage || "Enviando para a galeria..."}
                </p>
                <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-300 to-fuchsia-400 transition-all duration-300"
                    style={{ width: `${Math.max(uploadProgress, 8)}%` }}
                  />
                </div>
              </>
            ) : null}

            {step === "success" ? (
              <>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-200/90">
                  {BRAND_LABEL}
                </p>
                <h2
                  id={titleId}
                  className="mt-3 pr-10 text-2xl font-black tracking-tight sm:text-3xl"
                >
                  <span aria-hidden>🎉 </span>
                  {isBoomerangMode
                    ? "Boomerang publicado!"
                    : isGifMode
                      ? "GIF publicado!"
                      : isVideoMode
                        ? "Vídeo publicado!"
                        : "Foto publicada!"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/45">
                  {isBoomerangMode
                    ? "Seu Boomerang já está disponível na galeria do evento."
                    : isGifMode
                      ? "Seu GIF já está disponível na galeria do evento."
                      : isVideoMode
                        ? "Seu vídeo já está disponível na galeria do evento."
                        : "Sua foto já está disponível na galeria do evento."}
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-white px-6 text-sm font-black text-slate-950 transition hover:bg-amber-100"
                >
                  Fechar
                </button>
              </>
            ) : null}
          </div>
        </div>
      </dialog>
    </>
  );
}
