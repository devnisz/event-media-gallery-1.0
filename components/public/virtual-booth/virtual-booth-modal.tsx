"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { uploadGuestMediaFile } from "@/lib/guest-upload/upload-client";
import { composePhotoWithFrame } from "@/lib/virtual-booth/apply-frame";
import {
  buildVirtualBoothPhotoFile,
  canCapturePhoto,
} from "@/lib/virtual-booth/camera";

const BRAND_LABEL = "Cabine Virtual";

type VirtualBoothOption = {
  id: string;
  icon: string;
  title: string;
  description: string;
};

const OPTIONS: VirtualBoothOption[] = [
  {
    id: "photo",
    icon: "📸",
    title: "Cabine Virtual",
    description: "Tire uma foto personalizada para o evento.",
  },
  {
    id: "video",
    icon: "🎥",
    title: "Vídeo",
    description: "Grave um vídeo para compartilhar.",
  },
  {
    id: "gif",
    icon: "🎞️",
    title: "GIF",
    description: "Crie um GIF divertido para o evento.",
  },
];

type ModalStep =
  | "menu"
  | "no-camera"
  | "composing"
  | "final-preview"
  | "uploading"
  | "success";

type VirtualBoothModalProps = {
  open: boolean;
  eventId?: string;
  allowGuestUpload: boolean;
  frameUrl?: string;
  onClose: () => void;
};

function revokeObjectUrl(url: string | null) {
  if (url) {
    URL.revokeObjectURL(url);
  }
}

export function VirtualBoothModal({
  open,
  eventId,
  allowGuestUpload,
  frameUrl = "",
  onClose,
}: VirtualBoothModalProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const capturePreviewUrlRef = useRef<string | null>(null);
  const composedPreviewUrlRef = useRef<string | null>(null);
  const titleId = useId();
  const [step, setStep] = useState<ModalStep>("menu");
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
  const [errorMessage, setErrorMessage] = useState("");

  const officialFrameUrl = frameUrl.trim();
  const hasOfficialFrame = officialFrameUrl.length > 0;
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
      revokeObjectUrl(capturePreviewUrlRef.current);
      revokeObjectUrl(composedPreviewUrlRef.current);
    };
  }, []);

  function resetState() {
    revokeObjectUrl(capturePreviewUrl);
    revokeObjectUrl(composedPreviewUrl);

    setStep("menu");
    setSourceFile(null);
    setComposedFile(null);
    setCapturePreviewUrl(null);
    setComposedPreviewUrl(null);
    setUseFramedPreview(true);
    setUploadProgress(0);
    setUploadMessage("");
    setErrorMessage("");
  }

  function handleClose() {
    if (step === "uploading" || step === "composing") {
      return;
    }

    resetState();
    onClose();
  }

  async function handlePhotoOptionClick() {
    setErrorMessage("");

    if (!allowGuestUpload || !eventId) {
      setErrorMessage("Este evento não permite envio de fotos na galeria.");
      return;
    }

    const canCapture = await canCapturePhoto();

    if (!canCapture) {
      setStep("no-camera");
      return;
    }

    cameraInputRef.current?.click();
  }

  function handleOptionClick(optionId: string) {
    setErrorMessage("");

    if (optionId === "photo") {
      void handlePhotoOptionClick();
      return;
    }

    setErrorMessage("Em desenvolvimento");
  }

  async function applyOfficialFrameAutomatically(source: File) {
    setStep("composing");
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

  function handleCaptureChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !file.type.startsWith("image/")) {
      setErrorMessage("Selecione uma foto válida para continuar.");
      return;
    }

    revokeObjectUrl(capturePreviewUrl);
    revokeObjectUrl(composedPreviewUrl);

    const normalizedFile = buildVirtualBoothPhotoFile(file);
    const nextCaptureUrl = URL.createObjectURL(normalizedFile);

    setSourceFile(normalizedFile);
    setCapturePreviewUrl(nextCaptureUrl);
    setComposedFile(null);
    setComposedPreviewUrl(null);
    setUseFramedPreview(true);
    setErrorMessage("");

    if (hasOfficialFrame) {
      void applyOfficialFrameAutomatically(normalizedFile);
      return;
    }

    setStep("final-preview");
  }

  async function handlePublishPhoto() {
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
          : "Não foi possível publicar a foto.",
      );
    }
  }

  return (
    <>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="sr-only"
        onChange={handleCaptureChange}
      />

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="w-[min(100%,28rem)] max-w-[calc(100vw-2rem)] rounded-[2rem] border border-white/12 bg-slate-950/95 p-0 text-white shadow-[0_40px_120px_rgba(0,0,0,0.65)] backdrop-blur-2xl open:animate-rise"
        onClose={handleClose}
        onClick={(event) => {
          if (
            event.target === dialogRef.current &&
            step !== "uploading" &&
            step !== "composing"
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
            {step !== "uploading" && step !== "composing" ? (
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
                  Crie fotos personalizadas com a moldura oficial do evento.
                </p>

                {errorMessage ? (
                  <p className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100">
                    {errorMessage}
                  </p>
                ) : null}

                <ul className="mt-6 space-y-3">
                  {OPTIONS.map((option) => (
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
                            {option.id === "photo"
                              ? "📸 Cabine Virtual"
                              : option.title}
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
                  Captura de foto disponível apenas em dispositivos com câmera.
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
                  Preparando sua foto
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/45">
                  Aplicando a moldura oficial do evento...
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
                  Sua foto está pronta!
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/45">
                  {showingFramedVersion
                    ? "Personalizada com a moldura oficial do evento."
                    : "Visualizando a foto sem moldura. Você pode voltar à versão oficial."}
                </p>

                <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activePreviewUrl}
                    alt={
                      showingFramedVersion
                        ? "Prévia final com moldura"
                        : "Prévia da foto original"
                    }
                    className="max-h-[min(52vh,28rem)] w-full object-contain"
                  />
                </div>

                {errorMessage ? (
                  <p className="mt-4 text-sm font-semibold text-red-200">
                    {errorMessage}
                  </p>
                ) : null}

                <div className="mt-6 space-y-3">
                  <button
                    type="button"
                    onClick={() => void handlePublishPhoto()}
                    className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-300 via-orange-400 to-fuchsia-500 px-6 text-base font-black text-slate-950 shadow-[0_18px_60px_rgba(251,191,36,0.32)] transition hover:brightness-105 active:scale-[0.98]"
                  >
                    <span aria-hidden>✅</span>
                    Publicar foto
                  </button>

                  {hasOfficialFrame && composedFile ? (
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
                  Publicando foto
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
                  Foto publicada!
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/45">
                  Sua foto já está disponível na galeria do evento.
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
