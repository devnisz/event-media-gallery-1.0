"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  DEFAULT_GALLERY_LAYOUT,
  type GalleryLayout,
} from "@/lib/gallery/layout";

type EventGallerySettingsFormProps = {
  eventId: string;
  initialAllowPublicDelete: boolean;
  initialRequireDeletePin: boolean;
  initialAllowGuestUpload: boolean;
  initialRequireGuestUploadApproval: boolean;
  initialGalleryLayout?: GalleryLayout;
  hasDeletePin: boolean;
};

function isValidPin(pin: string): boolean {
  return /^\d{4,8}$/.test(pin.trim());
}

export function EventGallerySettingsForm({
  eventId,
  initialAllowPublicDelete,
  initialRequireDeletePin,
  initialAllowGuestUpload,
  initialRequireGuestUploadApproval,
  initialGalleryLayout = DEFAULT_GALLERY_LAYOUT,
  hasDeletePin,
}: EventGallerySettingsFormProps) {
  const router = useRouter();
  const [galleryLayout, setGalleryLayout] = useState<GalleryLayout>(
    initialGalleryLayout,
  );
  const [allowPublicDelete, setAllowPublicDelete] = useState(
    initialAllowPublicDelete,
  );
  const [requireDeletePin, setRequireDeletePin] = useState(
    initialAllowPublicDelete && initialRequireDeletePin,
  );
  const [allowGuestUpload, setAllowGuestUpload] = useState(
    initialAllowGuestUpload,
  );
  const [requireGuestUploadApproval, setRequireGuestUploadApproval] = useState(
    initialRequireGuestUploadApproval,
  );
  const [deletePin, setDeletePin] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function saveSettings() {
    const effectiveRequirePin = allowPublicDelete && requireDeletePin;
    const trimmedPin = deletePin.trim();

    setMessage("");
    setError("");

    if (effectiveRequirePin && !hasDeletePin && !trimmedPin) {
      setError("Informe um PIN de 4 a 8 dígitos.");
      return;
    }

    if (trimmedPin && !isValidPin(trimmedPin)) {
      setError("O PIN deve ter de 4 a 8 dígitos.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/events/${encodeURIComponent(eventId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allowPublicDelete,
          requireDeletePin: effectiveRequirePin,
          deletePin: trimmedPin || undefined,
          allowGuestUpload,
          requireGuestUploadApproval,
          galleryLayout,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        ok?: boolean;
        event?: {
          allowGuestUpload?: boolean;
          requireGuestUploadApproval?: boolean;
          allowPublicDelete?: boolean;
          requireDeletePin?: boolean;
          galleryLayout?: GalleryLayout;
        };
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível salvar.");
      }

      // UI reflete o valor persistido real (não otimista).
      if (payload.event) {
        if (typeof payload.event.allowGuestUpload === "boolean") {
          setAllowGuestUpload(payload.event.allowGuestUpload);
        }
        if (typeof payload.event.requireGuestUploadApproval === "boolean") {
          setRequireGuestUploadApproval(payload.event.requireGuestUploadApproval);
        }
        if (typeof payload.event.allowPublicDelete === "boolean") {
          setAllowPublicDelete(payload.event.allowPublicDelete);
        }
        if (typeof payload.event.requireDeletePin === "boolean") {
          setRequireDeletePin(payload.event.requireDeletePin);
        }
        if (
          payload.event.galleryLayout === "premium" ||
          payload.event.galleryLayout === "social"
        ) {
          setGalleryLayout(payload.event.galleryLayout);
        }
      }

      setDeletePin("");
      setMessage("Configurações da galeria salvas.");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar as configurações.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-200">
          Configurações da galeria
        </p>
        <h2 className="text-2xl font-black tracking-tight">
          Exclusão pública de mídias
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-white/50">
          Controle se visitantes podem remover mídias da galeria pública. A
          exclusão continua sendo soft-delete e validada no servidor.
        </p>
      </div>

      <div className="mt-6 space-y-4">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-amber-200/80">
            Visual da Galeria
          </p>
          <fieldset className="mt-4 space-y-3">
            <legend className="sr-only">Visual da Galeria</legend>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 p-4 transition hover:border-white/20">
              <input
                type="radio"
                name="galleryLayout"
                value="premium"
                checked={galleryLayout === "premium"}
                disabled={isSaving}
                onChange={() => setGalleryLayout("premium")}
                className="mt-1 size-4 accent-amber-300"
              />
              <span>
                <span className="block font-bold">Premium</span>
                <span className="mt-1 block text-sm leading-6 text-white/50">
                  Layout elegante e corporativo, com cards e destaque visual por
                  mídia.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 p-4 transition hover:border-white/20">
              <input
                type="radio"
                name="galleryLayout"
                value="social"
                checked={galleryLayout === "social"}
                disabled={isSaving}
                onChange={() => setGalleryLayout("social")}
                className="mt-1 size-4 accent-amber-300"
              />
              <span>
                <span className="block font-bold">Social Feed</span>
                <span className="mt-1 block text-sm leading-6 text-white/50">
                  Mosaico estilo Instagram, com foco total nas mídias e grade
                  compacta.
                </span>
              </span>
            </label>
          </fieldset>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-amber-200/80">
            Uploads dos convidados
          </p>
          <label className="mt-4 flex items-start gap-4">
            <input
              type="checkbox"
              checked={allowGuestUpload}
              disabled={isSaving}
              onChange={(event) => setAllowGuestUpload(event.target.checked)}
              className="mt-1 size-5 accent-amber-300"
            />
            <span>
              <span className="block font-bold">
                Permitir uploads públicos dos convidados
              </span>
              <span className="mt-1 block text-sm leading-6 text-white/50">
                Quando ligado, a galeria pública exibe um botão para convidados
                enviarem fotos e vídeos sem login.
              </span>
            </span>
          </label>
          <label className="mt-4 flex items-start gap-4 rounded-2xl border border-amber-300/15 bg-amber-300/[0.06] p-4">
            <input
              type="checkbox"
              checked={requireGuestUploadApproval}
              disabled={isSaving || !allowGuestUpload}
              onChange={(event) =>
                setRequireGuestUploadApproval(event.target.checked)
              }
              className="mt-1 size-5 accent-amber-300 disabled:opacity-50"
            />
            <span>
              <span className="block font-bold">
                Aprovar uploads antes de publicar
              </span>
              <span className="mt-1 block text-sm leading-6 text-white/50">
                Quando ligado, fotos e vídeos enviados por convidados ficam
                pendentes até aprovação no dashboard.
              </span>
              {!allowGuestUpload ? (
                <span className="mt-2 block text-xs font-semibold text-amber-100/70">
                  Ative uploads públicos dos convidados para usar esta opção.
                </span>
              ) : null}
            </span>
          </label>
        </div>

        <label className="flex items-start gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">
          <input
            type="checkbox"
            checked={allowPublicDelete}
            disabled={isSaving}
            onChange={(event) => {
              const checked = event.target.checked;
              setAllowPublicDelete(checked);

              if (!checked) {
                setRequireDeletePin(false);
              }
            }}
            className="mt-1 size-5 accent-amber-300"
          />
          <span>
            <span className="block font-bold">
              Permitir exclusão pública de mídias
            </span>
            <span className="mt-1 block text-sm leading-6 text-white/50">
              Quando desligado, o botão público some e a API pública bloqueia a
              operação.
            </span>
          </span>
        </label>

        {allowPublicDelete ? (
          <div className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-4">
            <label className="flex items-start gap-4">
              <input
                type="checkbox"
                checked={requireDeletePin}
                disabled={isSaving}
                onChange={(event) => setRequireDeletePin(event.target.checked)}
                className="mt-1 size-5 accent-amber-300"
              />
              <span>
                <span className="block font-bold">Exigir PIN para exclusão</span>
                <span className="mt-1 block text-sm leading-6 text-white/50">
                  Visitantes precisarão informar um PIN de 4 a 8 dígitos.
                </span>
              </span>
            </label>

            {requireDeletePin ? (
              <label className="block">
                <span className="text-sm font-semibold text-white/70">
                  Definir ou alterar PIN
                </span>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  minLength={4}
                  maxLength={8}
                  value={deletePin}
                  disabled={isSaving}
                  onChange={(event) => setDeletePin(event.target.value)}
                  placeholder={
                    hasDeletePin
                      ? "Deixe em branco para manter o PIN atual"
                      : "4 a 8 dígitos"
                  }
                  className="mt-2 min-h-12 w-full max-w-sm rounded-2xl border border-white/12 bg-black/35 px-4 text-white outline-none placeholder:text-white/35 focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/20 disabled:opacity-60"
                />
              </label>
            ) : null}
          </div>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-sm font-semibold text-red-300">{error}</p> : null}
      {message ? (
        <p className="mt-4 text-sm font-semibold text-emerald-300">{message}</p>
      ) : null}

      <button
        type="button"
        disabled={isSaving}
        onClick={() => void saveSettings()}
        className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-white px-7 text-sm font-black text-slate-950 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? "Salvando..." : "Salvar configurações"}
      </button>
    </section>
  );
}
