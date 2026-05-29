"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  CABINE_VIRTUAL_VIDEO_DURATION_DEFAULT_SECONDS,
  CABINE_VIRTUAL_VIDEO_DURATION_MAX_SECONDS,
  CABINE_VIRTUAL_VIDEO_DURATION_MIN_SECONDS,
  validateCabineVirtualSettingsInput,
} from "@/lib/virtual-booth/event-config";

type EventVirtualBoothSettingsFormProps = {
  eventId: string;
  initialCabineVirtualEnabled: boolean;
  initialCabineVirtualPhotoEnabled: boolean;
  initialCabineVirtualBoomerangEnabled: boolean;
  initialCabineVirtualVideoEnabled: boolean;
  initialCabineVirtualVideoMaxDurationSeconds: number;
};

export function EventVirtualBoothSettingsForm({
  eventId,
  initialCabineVirtualEnabled,
  initialCabineVirtualPhotoEnabled,
  initialCabineVirtualBoomerangEnabled,
  initialCabineVirtualVideoEnabled,
  initialCabineVirtualVideoMaxDurationSeconds,
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
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-200">
          📸 Cabine Virtual
        </p>
        <h2 className="text-2xl font-black tracking-tight">
          Recursos da Cabine Virtual
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-white/50">
          Defina quais tipos de captura os convidados podem usar na galeria
          pública. O GIF da cabine permanece disponível internamente até novas
          opções no painel.
        </p>
      </div>

      <div className="mt-6 space-y-4">
        <label className="flex items-start gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">
          <input
            type="checkbox"
            checked={cabineVirtualEnabled}
            disabled={isSaving}
            onChange={(event) => setCabineVirtualEnabled(event.target.checked)}
            className="mt-1 size-5 accent-amber-300"
          />
          <span>
            <span className="block font-bold">Habilitar Cabine Virtual</span>
            <span className="mt-1 block text-sm leading-6 text-white/50">
              Quando desligado, o botão da Cabine Virtual não aparece na
              galeria pública.
            </span>
          </span>
        </label>

        {cabineVirtualEnabled ? (
          <div className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-amber-200/80">
              Tipos de captura
            </p>

            <label className="flex items-start gap-4">
              <input
                type="checkbox"
                checked={cabineVirtualPhotoEnabled}
                disabled={isSaving}
                onChange={(event) =>
                  setCabineVirtualPhotoEnabled(event.target.checked)
                }
                className="mt-1 size-5 accent-amber-300"
              />
              <span>
                <span className="block font-bold">📸 Foto</span>
                <span className="mt-1 block text-sm leading-6 text-white/50">
                  Captura de foto com filtro Glam e moldura opcional.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-4">
              <input
                type="checkbox"
                checked={cabineVirtualBoomerangEnabled}
                disabled={isSaving}
                onChange={(event) =>
                  setCabineVirtualBoomerangEnabled(event.target.checked)
                }
                className="mt-1 size-5 accent-amber-300"
              />
              <span>
                <span className="block font-bold">🔄 Boomerang</span>
                <span className="mt-1 block text-sm leading-6 text-white/50">
                  Animação curta de vai-e-volta otimizada para compartilhamento.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-4">
              <input
                type="checkbox"
                checked={cabineVirtualVideoEnabled}
                disabled={isSaving}
                onChange={(event) =>
                  setCabineVirtualVideoEnabled(event.target.checked)
                }
                className="mt-1 size-5 accent-amber-300"
              />
              <span>
                <span className="block font-bold">🎥 Vídeo</span>
                <span className="mt-1 block text-sm leading-6 text-white/50">
                  Gravação curta pela câmera do dispositivo.
                </span>
              </span>
            </label>

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
                  <div className="mt-4 flex items-center gap-4">
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

            {captureWarning ? (
              <p className="rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100">
                {captureWarning}
              </p>
            ) : null}
          </div>
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
        className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-white px-7 text-sm font-black text-slate-950 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? "Salvando..." : "Salvar Cabine Virtual"}
      </button>
    </section>
  );
}
