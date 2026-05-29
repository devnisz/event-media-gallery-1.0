"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type EventLiveMomentsSettingsFormProps = {
  eventId: string;
  initialLiveMomentsEnabled: boolean;
};

export function EventLiveMomentsSettingsForm({
  eventId,
  initialLiveMomentsEnabled,
}: EventLiveMomentsSettingsFormProps) {
  const router = useRouter();
  const [liveMomentsEnabled, setLiveMomentsEnabled] = useState(
    initialLiveMomentsEnabled,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function saveSettings() {
    setMessage("");
    setError("");
    setIsSaving(true);

    try {
      const response = await fetch(
        `/api/events/${encodeURIComponent(eventId)}/live-moments-config`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ liveMomentsEnabled }),
        },
      );
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "Não foi possível salvar.");
      }

      setMessage("Configuração de Momentos ao Vivo salva.");
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
          ✨ Momentos ao Vivo
        </p>
        <h2 className="text-2xl font-black tracking-tight">
          Destaque na galeria
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-white/50">
          Exibe um visualizador premium no topo da galeria pública, reunindo
          fotos, boomerangs e vídeos do evento em sequência fluida.
        </p>
      </div>

      <label className="mt-6 flex items-start gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">
        <input
          type="checkbox"
          checked={liveMomentsEnabled}
          disabled={isSaving}
          onChange={(event) => setLiveMomentsEnabled(event.target.checked)}
          className="mt-1 size-5 accent-amber-300"
        />
        <span>
          <span className="block font-bold">Habilitar Momentos ao Vivo</span>
          <span className="mt-1 block text-sm leading-6 text-white/50">
            Quando desligado, nada aparece na galeria pública.
          </span>
        </span>
      </label>

      {error ? (
        <p className="mt-4 text-sm font-semibold text-red-300">{error}</p>
      ) : null}
      {message ? (
        <p className="mt-4 text-sm font-semibold text-emerald-300">{message}</p>
      ) : null}

      <button
        type="button"
        disabled={isSaving}
        onClick={() => void saveSettings()}
        className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-white px-7 text-sm font-black text-slate-950 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? "Salvando..." : "Salvar Momentos ao Vivo"}
      </button>
    </section>
  );
}
