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
  startVirtualBoothMediaStream,
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
import { VirtualBoothFlowStatus } from "./virtual-booth-flow-status";
import { VirtualBoothPublishPreview } from "./virtual-booth-publish-preview";
import { VirtualBoothSourceSheet } from "./virtual-booth-source-sheet";
import { boothCloseButtonClass, boothShellClass } from "./virtual-booth-ui";
import { cn } from "@/lib/utils";

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
  const [videoAudioNotice, setVideoAudioNotice] = useState<string | null>(null);

  const officialFrameUrl = frameUrl.trim();
  const hasOfficialFrame = officialFrameUrl.length > 0;
  const menuOptions = useMemo(
    () => buildVirtualBoothMenuOptions(cabineConfig),
    [cabineConfig],
  );
  const isBoomerangMode = captureMode === "boomerang";
  const isVideoMode = captureMode === "video";
  const isMotionMode = isBoomerangMode;
  const isMenuStep = step === "menu";
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

  const isPreviewStep =
    step === "final-preview" && Boolean(activePreviewUrl);
  const isFlowStatusStep =
    step === "no-camera" ||
    step === "composing" ||
    step === "uploading" ||
    step === "success";

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
    setVideoAudioNotice(null);
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
    setVideoAudioNotice(null);

    try {
      const includeAudio = mode === "video";
      const result = await startVirtualBoothMediaStream({ includeAudio });
      cameraStreamRef.current = result.stream;
      setCameraStream(result.stream);
      setVideoAudioNotice(result.audioWarning);
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
        className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none rounded-none border-0 bg-neutral-950 p-0 text-white shadow-none open:animate-rise"
        onClose={handleClose}
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
            audioNotice={videoAudioNotice}
            onCameraReady={() => setCameraReady(true)}
            onClose={handleClose}
            onPrimaryAction={
              isVideoMode ? beginVideoRecording : startCountdown
            }
            onFinishVideoRecording={finishVideoRecordingManually}
          />
        ) : isMenuStep ? (
          <div className={cn(boothShellClass, "justify-center")}>
            <button
              type="button"
              onClick={handleClose}
              className={boothCloseButtonClass}
              aria-label="Fechar"
            >
              ×
            </button>
            <VirtualBoothExperienceMenu
              titleId={titleId}
              options={menuOptions}
              errorMessage={errorMessage || undefined}
              onSelect={handleOptionClick}
            />
          </div>
        ) : isPreviewStep && activePreviewUrl ? (
          <VirtualBoothPublishPreview
            titleId={titleId}
            isBoomerangMode={isBoomerangMode}
            isVideoMode={isVideoMode}
            isMotionMode={isMotionMode}
            isVideoFromGallery={isVideoFromGallery}
            showingFramedVersion={showingFramedVersion}
            hasOfficialFrame={hasOfficialFrame}
            composedFile={composedFile}
            activePreviewUrl={activePreviewUrl}
            errorMessage={errorMessage}
            audioNotice={isVideoMode ? videoAudioNotice : null}
            onClose={handleClose}
            onPublish={() => void handlePublishMedia()}
            onReset={resetState}
            onToggleFrame={() => {
              setUseFramedPreview((current) => !current);
              setErrorMessage("");
            }}
            onChangeVideo={openGalleryVideoPicker}
          />
        ) : isFlowStatusStep ? (
          <VirtualBoothFlowStatus
            titleId={titleId}
            variant={step}
            isBoomerangMode={isBoomerangMode}
            isVideoMode={isVideoMode}
            message={
              step === "composing"
                ? composingMessage
                : step === "uploading"
                  ? uploadMessage
                  : undefined
            }
            uploadProgress={uploadProgress}
            errorMessage={errorMessage || undefined}
            onClose={handleClose}
            onBack={
              step === "no-camera" ? () => setStep("menu") : undefined
            }
          />
        ) : null}

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
      </dialog>
    </>
  );
}
