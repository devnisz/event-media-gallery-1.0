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
import {
  buildPocketBoothPhotoFile,
  canCapturePhoto,
} from "@/lib/pocket-booth/camera";

type PocketBoothOption = {
  id: string;
  icon: string;
  title: string;
  description: string;
};

const OPTIONS: PocketBoothOption[] = [
  {
    id: "photo",
    icon: "📸",
    title: "Foto",
    description: "Tire uma foto usando seu celular.",
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

type ModalStep = "menu" | "preview" | "uploading" | "no-camera";

type PocketBoothModalProps = {
  open: boolean;
  eventId?: string;
  allowGuestUpload: boolean;
  onClose: () => void;
};

export function PocketBoothModal({
  open,
  eventId,
  allowGuestUpload,
  onClose,
}: PocketBoothModalProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const titleId = useId();
  const [step, setStep] = useState<ModalStep>("menu");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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
    previewUrlRef.current = previewUrl;

    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, [previewUrl]);

  function resetState() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setStep("menu");
    setPendingFile(null);
    setPreviewUrl(null);
    setUploadProgress(0);
    setUploadMessage("");
    setErrorMessage("");
  }

  function handleClose() {
    if (step === "uploading") {
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

  function handleCaptureChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !file.type.startsWith("image/")) {
      setErrorMessage("Selecione uma foto válida para continuar.");
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const normalizedFile = buildPocketBoothPhotoFile(file);
    const nextPreviewUrl = URL.createObjectURL(normalizedFile);

    setPendingFile(normalizedFile);
    setPreviewUrl(nextPreviewUrl);
    setStep("preview");
    setErrorMessage("");
  }

  function handleCancelPreview() {
    resetState();
  }

  async function handlePublishPhoto() {
    if (!pendingFile || !eventId) {
      return;
    }

    setStep("uploading");
    setUploadProgress(0);
    setUploadMessage("Preparando upload...");
    setErrorMessage("");

    try {
      await uploadGuestMediaFile(eventId, pendingFile, (update) => {
        setUploadProgress(update.progress);
        setUploadMessage(update.message);
      });

      resetState();
      onClose();
      router.refresh();
    } catch (error) {
      setStep("preview");
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
          if (event.target === dialogRef.current && step !== "uploading") {
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
            {step !== "uploading" ? (
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
                  Cabine de Bolso
                </p>
                <h2
                  id={titleId}
                  className="mt-3 pr-10 text-2xl font-black tracking-tight sm:text-3xl"
                >
                  Criar conteúdo para o evento
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/45">
                  Escolha o formato que deseja criar e compartilhar na galeria.
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
                  Cabine de Bolso
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

            {step === "preview" && previewUrl ? (
              <>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-200/90">
                  Cabine de Bolso
                </p>
                <h2
                  id={titleId}
                  className="mt-3 pr-10 text-2xl font-black tracking-tight sm:text-3xl"
                >
                  Prévia da foto
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/45">
                  Confira a captura antes de publicar na galeria do evento.
                </p>

                <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Prévia da foto capturada"
                    className="max-h-[min(52vh,28rem)] w-full object-contain"
                  />
                </div>

                {errorMessage ? (
                  <p className="mt-4 text-sm font-semibold text-red-200">
                    {errorMessage}
                  </p>
                ) : null}

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleCancelPreview}
                    className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-bold text-white/80 transition hover:bg-white/10"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handlePublishPhoto()}
                    className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-gradient-to-r from-amber-300 via-orange-400 to-fuchsia-500 px-6 text-sm font-black text-slate-950 shadow-[0_12px_40px_rgba(251,191,36,0.25)] transition hover:brightness-105 active:scale-[0.98]"
                  >
                    Publicar foto
                  </button>
                </div>
              </>
            ) : null}

            {step === "uploading" ? (
              <>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-200/90">
                  Cabine de Bolso
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
          </div>
        </div>
      </dialog>
    </>
  );
}
