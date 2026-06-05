"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { dispatchGalleryMediaPublished } from "@/lib/gallery/client-refresh";
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
import {
  startVideoRecordingFromMediaStream,
  type VideoRecordingHandle,
} from "@/lib/virtual-booth/video-capture";
import {
  CABINE_GALLERY_PHOTO_ACCEPT,
  CABINE_GALLERY_VIDEO_ACCEPT,
  normalizeGalleryImportFile,
  validateGalleryPhotoFile,
  validateGalleryVideoFile,
} from "@/lib/virtual-booth/gallery-import";
import { VirtualBoothCameraStage } from "./virtual-booth-camera-stage";
import { VirtualBoothExperienceMenu } from "./virtual-booth-experience-menu";
import { VirtualBoothSourceSheet } from "./virtual-booth-source-sheet";
import { cn } from "@/lib/utils";

const BRAND_LABEL = "Cabine Virtual";

type CaptureMode = "photo" | "boomerang" | "video";

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
  eventSlug: string;
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
  eventSlug,
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
  const videoRecordingHandleRef = useRef<VideoRecordingHandle | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
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
  const [videoRecordingProgress, setVideoRecordingProgress] = useState(0);
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
  const [sourceSheetVariant, setSourceSheetVariant] = useState<
    "photo" | "video" | null
  >(null);
  const [isVideoFromGallery, setIsVideoFromGallery] = useState(false);

  const officialFrameUrl = frameUrl.trim();
  const hasOfficialFrame = officialFrameUrl.length > 0;
  const menuOptions = useMemo(
    () => buildVirtualBoothMenuOptions(cabineConfig),
    [cabineConfig],
  );
  const isBoomerangMode = captureMode === "boomerang";
  const isVideoMode = captureMode === "video";
  const isMotionMode = isBoomerangMode;
  const isImmersiveCapture =
    step === "camera" || step === "countdown" || isRecordingMotion;
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
      videoRecordingHandleRef.current?.stop();
      videoRecordingHandleRef.current = null;
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

  function stopActiveVideoRecording() {
    videoRecordingHandleRef.current?.stop();
    videoRecordingHandleRef.current = null;
  }

  function resetState() {
    countdownTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    countdownTimersRef.current = [];
    stopActiveVideoRecording();
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
    setVideoRecordingProgress(0);
    setSourceFile(null);
    setComposedFile(null);
    setCapturePreviewUrl(null);
    setComposedPreviewUrl(null);
    setUseFramedPreview(true);
    setUploadProgress(0);
    setUploadMessage("");
    setComposingMessage("");
    setErrorMessage("");
    setSourceSheetVariant(null);
    setIsVideoFromGallery(false);
  }

  function handleClose() {
    if (sourceSheetVariant) {
      setSourceSheetVariant(null);
      return;
    }

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

  function openGalleryPhotoPicker() {
    setSourceSheetVariant(null);
    photoInputRef.current?.click();
  }

  function openGalleryVideoPicker() {
    setSourceSheetVariant(null);
    videoInputRef.current?.click();
  }

  function beginPhotoFlow() {
    setErrorMessage("");
    setCaptureMode("photo");

    if (!allowGuestUpload || !eventId) {
      setErrorMessage("Este evento não permite envio de mídia na galeria.");
      return;
    }

    const showCamera = cabineConfig.cameraEnabled;
    const showGallery = cabineConfig.galleryImportEnabled;

    if (showCamera && showGallery) {
      setSourceSheetVariant("photo");
      return;
    }

    if (showCamera) {
      void startCameraCapture("photo");
      return;
    }

    if (showGallery) {
      openGalleryPhotoPicker();
      return;
    }

    setErrorMessage("Foto indisponível neste evento.");
  }

  function beginVideoFlow() {
    setErrorMessage("");
    setCaptureMode("video");

    if (!allowGuestUpload || !eventId) {
      setErrorMessage("Este evento não permite envio de mídia na galeria.");
      return;
    }

    const showCamera = cabineConfig.cameraEnabled;
    const showGallery = cabineConfig.galleryImportEnabled;

    if (showCamera && showGallery) {
      setSourceSheetVariant("video");
      return;
    }

    if (showCamera) {
      void startCameraCapture("video");
      return;
    }

    if (showGallery) {
      openGalleryVideoPicker();
      return;
    }

    setErrorMessage("Vídeo indisponível neste evento.");
  }

  function applyGalleryVideoPreview(file: File) {
    revokeObjectUrl(capturePreviewUrl);
    revokeObjectUrl(composedPreviewUrl);

    setSourceFile(file);
    setCapturePreviewUrl(URL.createObjectURL(file));
    setComposedFile(null);
    setComposedPreviewUrl(null);
    setUseFramedPreview(false);
    setIsVideoFromGallery(true);
    setStep("final-preview");
    setErrorMessage("");
  }

  async function handleGalleryPhotoSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const validationError = validateGalleryPhotoFile(file);

    if (validationError) {
      setErrorMessage(validationError);
      setStep("menu");
      return;
    }

    setCaptureMode("photo");
    await prepareCapturedPhoto(normalizeGalleryImportFile(file));
  }

  function handleGalleryVideoSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const validationError = validateGalleryVideoFile(file);

    if (validationError) {
      setErrorMessage(validationError);

      if (step !== "final-preview") {
        setStep("menu");
      }

      return;
    }

    setCaptureMode("video");
    applyGalleryVideoPreview(normalizeGalleryImportFile(file));
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
      beginPhotoFlow();
      return;
    }

    if (optionId === "boomerang") {
      if (!cabineConfig.cameraEnabled) {
        setErrorMessage("Captura por câmera desativada neste evento.");
        return;
      }

      void startCameraCapture("boomerang");
      return;
    }

    if (optionId === "video") {
      beginVideoFlow();
      return;
    }

    setErrorMessage("Este recurso não está disponível neste evento.");
  }

  function applyRecordedVideoFile(recordedFile: File) {
    setIsRecordingMotion(false);
    setVideoRecordingProgress(0);
    stopActiveVideoRecording();
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
    setIsVideoFromGallery(false);
    setStep("final-preview");
  }

  function beginVideoRecording() {
    const stream = cameraStreamRef.current;

    if (!stream) {
      setErrorMessage("A câmera ainda não está pronta para gravar.");
      return;
    }

    if (!cameraReady) {
      return;
    }

    setErrorMessage("");
    setComposingMessage("");
    setVideoRecordingProgress(0);
    setIsRecordingMotion(true);
    setStep("camera");

    try {
      const session = startVideoRecordingFromMediaStream(
        stream,
        cabineConfig.videoMaxDurationSeconds,
        {
          onProgress: (progress) => {
            setVideoRecordingProgress(progress.fraction);
          },
        },
      );

      videoRecordingHandleRef.current = session;

      void session.finished
        .then((recordedFile) => {
          applyRecordedVideoFile(recordedFile);
        })
        .catch((error) => {
          setIsRecordingMotion(false);
          setVideoRecordingProgress(0);
          stopActiveVideoRecording();
          setStep("camera");
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Não foi possível gravar o vídeo. Tente novamente.",
          );
        });
    } catch (error) {
      setIsRecordingMotion(false);
      setVideoRecordingProgress(0);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível iniciar a gravação.",
      );
    }
  }

  function finishVideoRecordingManually() {
    if (!videoRecordingHandleRef.current) {
      return;
    }

    videoRecordingHandleRef.current.stop();
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
        logLabel: "Boomerang",
        onProgress: (frameIndex, totalFrames) => {
          setComposingMessage(
            `Capturando Boomerang (${frameIndex}/${totalFrames})...`,
          );
        },
      });

      console.log(
        "[Cabine Virtual Boomerang] resumo da captura no modal",
        stats,
      );

      setIsRecordingMotion(false);
      stopMediaStream(cameraStreamRef.current);
      cameraStreamRef.current = null;
      setCameraStream(null);
      setCameraReady(false);

      setStep("composing");
      setComposingMessage("Gerando Boomerang...");

      revokeObjectUrl(capturePreviewUrl);
      revokeObjectUrl(composedPreviewUrl);

      const sequenceFrames = isBoomerangMode
        ? buildBoomerangSequence(rawFrames)
        : rawFrames;

      console.log("[Cabine Virtual Boomerang] frames na sequência final", {
          capturados: rawFrames.length,
          sequencia: sequenceFrames.length,
        },
      );

      const { glamGif, framedGif } = await processVirtualBoothGifFrames(
        sequenceFrames,
        {
          frameUrl: hasOfficialFrame ? officialFrameUrl : undefined,
          glamConfig: ALWAYS_ON_GLAM_FILTER,
          fileNamePrefix: BOOMERANG_FILE_PREFIX,
          logLabel: "Boomerang",
          onStage: setComposingMessage,
          encodeOptions: {
            frameDelayMs: BOOMERANG_FRAME_DELAY_MS,
            quality: BOOMERANG_GIF_QUALITY,
            maxLongEdge: BOOMERANG_MAX_LONG_EDGE,
          },
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
          "Não foi possível aplicar a moldura. Você ainda pode publicar o Boomerang sem moldura.",
        );
      }
    } catch (error) {
      setIsRecordingMotion(false);
      setStep("camera");
      setFlashVisible(false);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível gerar o Boomerang. Tente novamente.",
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
        value: "•",
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
        if (isMotionMode) {
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
      const publishedMedia = await uploadGuestMediaFile(
        eventId,
        activePublishFile,
        (update) => {
          setUploadProgress(update.progress);
          setUploadMessage(update.message);
        },
      );

      dispatchGalleryMediaPublished({
        media: publishedMedia,
        eventSlug,
        eventId,
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
            : isVideoMode
              ? "Não foi possível publicar o vídeo."
              : "Não foi possível publicar a foto.",
      );
    }
  }

  return (
    <>
      <input
        ref={photoInputRef}
        type="file"
        accept={CABINE_GALLERY_PHOTO_ACCEPT}
        className="sr-only"
        onChange={(event) => void handleGalleryPhotoSelected(event)}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept={CABINE_GALLERY_VIDEO_ACCEPT}
        className="sr-only"
        onChange={handleGalleryVideoSelected}
      />

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className={cn(
          "p-0 text-white open:animate-rise",
          isImmersiveCapture
            ? "fixed inset-0 m-0 h-full max-h-none w-full max-w-none rounded-none border-0 bg-black shadow-none"
            : cn(
                "max-w-[calc(100vw-2rem)] rounded-[1.25rem] border border-white/[0.08] bg-neutral-950/98 shadow-[0_32px_100px_rgba(0,0,0,0.55)] backdrop-blur-xl",
                step === "menu"
                  ? "w-[min(100%,36rem)] sm:w-[min(100%,40rem)]"
                  : "w-[min(100%,28rem)]",
              ),
        )}
        onClose={handleClose}
        onClick={(event) => {
          if (
            event.target === dialogRef.current &&
            !isImmersiveCapture &&
            step !== "uploading" &&
            step !== "composing"
          ) {
            handleClose();
          }
        }}
      >
        {isImmersiveCapture ? (
          <VirtualBoothCameraStage
            titleId={titleId}
            videoRef={videoRef}
            captureMode={captureMode}
            step={step === "countdown" ? "countdown" : "camera"}
            cameraReady={cameraReady}
            isRecordingMotion={isRecordingMotion}
            countdownDisplay={countdownDisplay}
            countdownPhase={countdownPhase}
            flashVisible={flashVisible}
            videoRecordingProgress={videoRecordingProgress}
            composingMessage={composingMessage}
            errorMessage={errorMessage}
            videoMaxDurationSeconds={cabineConfig.videoMaxDurationSeconds}
            onCameraReady={() => setCameraReady(true)}
            onClose={handleClose}
            onPrimaryAction={
              isVideoMode ? beginVideoRecording : startCountdown
            }
            onFinishVideoRecording={finishVideoRecordingManually}
          />
        ) : (
        <div className="relative overflow-hidden rounded-[1.25rem]">
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.035),transparent_72%)]",
              step !== "menu" &&
                "h-32 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05),transparent_70%)]",
            )}
          />

          <div
            className={cn(
              "relative",
              step === "menu" ? "px-5 py-7 sm:px-8 sm:py-9" : "p-6 sm:p-8",
            )}
          >
            {step !== "uploading" && step !== "composing" ? (
              <button
                type="button"
                onClick={handleClose}
                className="absolute right-5 top-5 grid size-10 place-items-center rounded-full border border-white/[0.08] bg-white/[0.03] text-lg text-white/55 transition hover:border-white/15 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
                aria-label="Fechar"
              >
                ×
              </button>
            ) : null}

            {step === "menu" ? (
              <VirtualBoothExperienceMenu
                titleId={titleId}
                options={menuOptions}
                errorMessage={errorMessage || undefined}
                onSelect={handleOptionClick}
              />
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
                    : isVideoMode
                      ? "Seu vídeo está pronto!"
                      : "Sua foto está pronta!"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/45">
                  {isBoomerangMode
                    ? showingFramedVersion
                      ? "Boomerang animado com moldura oficial do evento."
                      : "Prévia do Boomerang pronto para publicar."
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
                      : isVideoMode
                        ? "Publicar vídeo"
                        : "Publicar foto"}
                  </button>

                  {isVideoMode && isVideoFromGallery ? (
                    <button
                      type="button"
                      onClick={openGalleryVideoPicker}
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-white/10 px-5 text-sm font-semibold text-white/45 transition hover:border-white/15 hover:bg-white/[0.04] hover:text-white/70"
                    >
                      Trocar Vídeo
                    </button>
                  ) : isMotionMode || isVideoMode ? (
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
                    : isVideoMode
                      ? "Vídeo publicado!"
                      : "Foto publicada!"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/45">
                  {isBoomerangMode
                    ? "Seu Boomerang já está disponível na galeria do evento."
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

          <VirtualBoothSourceSheet
            embedded
            open={sourceSheetVariant !== null}
            variant={sourceSheetVariant ?? "photo"}
            showCamera={cabineConfig.cameraEnabled}
            showGallery={cabineConfig.galleryImportEnabled}
            onCamera={() => {
              const variant = sourceSheetVariant;
              setSourceSheetVariant(null);

              if (variant === "photo") {
                void startCameraCapture("photo");
                return;
              }

              if (variant === "video") {
                void startCameraCapture("video");
              }
            }}
            onGallery={() => {
              if (sourceSheetVariant === "photo") {
                openGalleryPhotoPicker();
                return;
              }

              if (sourceSheetVariant === "video") {
                openGalleryVideoPicker();
              }
            }}
            onDismiss={() => setSourceSheetVariant(null)}
          />
        </div>
        )}
      </dialog>
    </>
  );
}
