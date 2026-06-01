"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  CABINE_VIRTUAL_VIDEO_DURATION_DEFAULT_SECONDS,
  CABINE_VIRTUAL_VIDEO_DURATION_MAX_SECONDS,
  CABINE_VIRTUAL_VIDEO_DURATION_MIN_SECONDS,
  validateCabineVirtualSettingsInput,
} from "@/lib/virtual-booth/event-config";
import { cn } from "@/lib/utils";

type EventVirtualBoothSettingsFormProps = {
  eventId: string;
  initialCabineVirtualEnabled: boolean;
  initialCabineVirtualPhotoEnabled: boolean;
  initialCabineVirtualBoomerangEnabled: boolean;
  initialCabineVirtualVideoEnabled: boolean;
  initialCabineVirtualVideoMaxDurationSeconds: number;
  initialCabineVirtualCameraEnabled: boolean;
  initialCabineVirtualGalleryImportEnabled: boolean;
};

function FeatureCard({
  emoji,
  title,
  description,
  enabled,
  disabled,
  onToggle,
}: {
  emoji: string;
  title: string;
  description: string;
  enabled: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "w-full rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50",
        enabled
          ? "border-amber-300/25 bg-amber-300/[0.07] hover:border-amber-300/35"
          : "border-white/10 bg-black/20 hover:border-white/15 hover:bg-black/30",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-2xl" aria-hidden>
          {emoji}
        </span>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
            enabled
              ? "bg-emerald-400/15 text-emerald-200"
              : "bg-white/8 text-white/40",
          )}
        >
          {enabled ? "Ativado" : "Desativado"}
        </span>
      </div>
      <p className="mt-3 text-sm font-bold text-white">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-white/50">{description}</p>
    </button>
  );
}

function SourceCard({
  title,
  description,
  enabled,
  disabled,
  onToggle,
}: {
  title: string;
  description: string;
  enabled: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "w-full rounded-xl border p-3.5 text-left transition disabled:cursor-not-allowed disabled:opacity-50",
        enabled
          ? "border-white/12 bg-white/[0.05]"
          : "border-white/8 bg-black/15 hover:bg-black/25",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white">{title}</p>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
            enabled ? "text-emerald-200" : "text-white/35",
          )}
        >
          {enabled ? "Ativado" : "Off"}
        </span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-white/45">{description}</p>
    </button>
  );
}

export function EventVirtualBoothSettingsForm({
  eventId,
  initialCabineVirtualEnabled,
  initialCabineVirtualPhotoEnabled,
  initialCabineVirtualBoomerangEnabled,
  initialCabineVirtualVideoEnabled,
  initialCabineVirtualVideoMaxDurationSeconds,
  initialCabineVirtualCameraEnabled,
  initialCabineVirtualGalleryImportEnabled,
}: EventVirtualBoothSettingsFormProps) {
  const router = useRouter();
  const [cabineVirtualEnabled, setCabineVirtualEnabled] = useState(
    initialCabineVirtualEnabled,
  );
  const [cabineVirtualPhotoEnabled, setCabineVirtualPhotoEnabled] = useState(
    initialCabineVirtualPhotoEnabled,
  );
  const [cabineVirtualBoomerangEnabled, setCabineVirtualBoomerangEnabled] =
    useState(initialCabineVirtualBoomerangEnabled);
  const [cabineVirtualVideoEnabled, setCabineVirtualVideoEnabled] = useState(
    initialCabineVirtualVideoEnabled,
  );
  const [cabineVirtualVideoMaxDurationSeconds, setCabineVirtualVideoMaxDurationSeconds] =
    useState(initialCabineVirtualVideoMaxDurationSeconds);
  const [cabineVirtualCameraEnabled, setCabineVirtualCameraEnabled] = useState(
    initialCabineVirtualCameraEnabled,
  );
  const [cabineVirtualGalleryImportEnabled, setCabineVirtualGalleryImportEnabled] =
    useState(initialCabineVirtualGalleryImportEnabled);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const captureWarning =
    cabineVirtualEnabled &&
    !cabineVirtualPhotoEnabled &&
    !cabineVirtualBoomerangEnabled &&
    !cabineVirtualVideoEnabled
      ? "Ative pelo menos um tipo de captura (Foto, Boomerang ou Vídeo) ou desligue a Cabine Virtual."
      : "";

  async function saveSettings() {
    setMessage("");
    setError("");

    const payload = {
      cabineVirtualEnabled,
      cabineVirtualPhotoEnabled,
      cabineVirtualBoomerangEnabled,
      cabineVirtualVideoEnabled,
      cabineVirtualVideoMaxDurationSeconds,
      cabineVirtualCameraEnabled,
      cabineVirtualGalleryImportEnabled,
    };

    const validationError = validateCabineVirtualSettingsInput(payload);

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(
        `/api/events/${encodeURIComponent(eventId)}/virtual-booth-config`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "Não foi possível salvar.");
      }

      setMessage("Configurações da Cabine Virtual salvas.");
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
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-200/90">
          Cabine Virtual
        </p>
        <h2 className="text-xl font-black tracking-tight text-white">
          Recursos da cabine
        </h2>
        <p className="max-w-2xl text-sm text-white/45">
          Escolha os formatos e origens disponíveis na galeria pública.
        </p>
      </div>

      <div className="mt-5 space-y-4">
        <FeatureCard
          emoji="✨"
          title="Cabine Virtual"
          description="Exibe o botão da cabine na galeria pública para convidados."
          enabled={cabineVirtualEnabled}
          disabled={isSaving}
          onToggle={() => setCabineVirtualEnabled((value) => !value)}
        />

        {cabineVirtualEnabled ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <FeatureCard
                emoji="📸"
                title="Foto"
                description="Captura de fotos com moldura e filtro Glam."
                enabled={cabineVirtualPhotoEnabled}
                disabled={isSaving}
                onToggle={() =>
                  setCabineVirtualPhotoEnabled((value) => !value)
                }
              />
              <FeatureCard
                emoji="🔄"
                title="Boomerang"
                description="Animação curta otimizada para compartilhamento."
                enabled={cabineVirtualBoomerangEnabled}
                disabled={isSaving}
                onToggle={() =>
                  setCabineVirtualBoomerangEnabled((value) => !value)
                }
              />
              <FeatureCard
                emoji="🎥"
                title="Vídeo"
                description="Vídeos rápidos para stories e redes sociais."
                enabled={cabineVirtualVideoEnabled}
                disabled={isSaving}
                onToggle={() =>
                  setCabineVirtualVideoEnabled((value) => !value)
                }
              />
            </div>

            {cabineVirtualVideoEnabled ? (
              <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.06] p-4">
                <label className="block">
                  <span className="text-sm font-semibold text-white/80">
                    Tempo máximo de gravação
                  </span>
                  <span className="mt-1 block text-xs text-white/45">
                    {CABINE_VIRTUAL_VIDEO_DURATION_MIN_SECONDS}s a{" "}
                    {CABINE_VIRTUAL_VIDEO_DURATION_MAX_SECONDS}s — padrão{" "}
                    {CABINE_VIRTUAL_VIDEO_DURATION_DEFAULT_SECONDS}s
                  </span>
                  <div className="mt-3 flex items-center gap-4">
                    <input
                      type="range"
                      min={CABINE_VIRTUAL_VIDEO_DURATION_MIN_SECONDS}
                      max={CABINE_VIRTUAL_VIDEO_DURATION_MAX_SECONDS}
                      step={1}
                      value={cabineVirtualVideoMaxDurationSeconds}
                      disabled={isSaving}
                      onChange={(event) =>
                        setCabineVirtualVideoMaxDurationSeconds(
                          Number(event.target.value),
                        )
                      }
                      className="h-2 min-w-0 flex-1 accent-amber-300"
                    />
                    <span className="min-w-[3.5rem] text-right text-lg font-black tabular-nums text-amber-100">
                      {cabineVirtualVideoMaxDurationSeconds}s
                    </span>
                  </div>
                </label>
              </div>
            ) : null}

            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.26em] text-white/35">
                Origem da mídia
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <SourceCard
                  title="Captura por câmera"
                  description="Tirar foto ou gravar vídeo ao vivo na cabine."
                  enabled={cabineVirtualCameraEnabled}
                  disabled={isSaving}
                  onToggle={() =>
                    setCabineVirtualCameraEnabled((value) => !value)
                  }
                />
                <SourceCard
                  title="Importação da galeria"
                  description="Escolher foto ou vídeo já existente no celular."
                  enabled={cabineVirtualGalleryImportEnabled}
                  disabled={isSaving}
                  onToggle={() =>
                    setCabineVirtualGalleryImportEnabled((value) => !value)
                  }
                />
              </div>
            </div>

            {captureWarning ? (
              <p className="rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100">
                {captureWarning}
              </p>
            ) : null}
          </>
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 text-sm font-semibold text-red-300">{error}</p>
      ) : null}
      {message ? (
        <p className="mt-4 text-sm font-semibold text-emerald-300">{message}</p>
      ) : null}

      <button
        type="button"
        disabled={isSaving || Boolean(captureWarning)}
        onClick={() => void saveSettings()}
        className="mt-5 inline-flex min-h-10 items-center justify-center rounded-full bg-white px-6 text-sm font-black text-slate-950 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? "Salvando..." : "Salvar Cabine Virtual"}
      </button>
    </section>
  );
}
