"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type EventInteractionsSettingsFormProps = {
  eventId: string;
  initialAllowLikes: boolean;
  initialAllowMediaShare: boolean;
};

export function EventInteractionsSettingsForm({
  eventId,
  initialAllowLikes,
  initialAllowMediaShare,
}: EventInteractionsSettingsFormProps) {
  const router = useRouter();
  const [allowLikes, setAllowLikes] = useState(initialAllowLikes);
  const [allowMediaShare, setAllowMediaShare] = useState(initialAllowMediaShare);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function saveSettings() {
    setMessage("");
    setError("");
    setIsSaving(true);

    try {
      const response = await fetch(
        `/api/events/${encodeURIComponent(eventId)}/interactions-config`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ allowLikes, allowMediaShare }),
        },
      );
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "Não foi possível salvar.");
      }

      setMessage("Configurações de interações salvas.");
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
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-rose-200">
          Interações
        </p>
        <h2 className="text-2xl font-black tracking-tight">
          Curtidas e compartilhamento
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-white/50">
          Controle como visitantes interagem com cada mídia na galeria e nos
          Momentos ao Vivo.
        </p>
      </div>

      <label className="mt-6 flex items-start gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">
        <input
          type="checkbox"
          checked={allowLikes}
          disabled={isSaving}
          onChange={(event) => setAllowLikes(event.target.checked)}
          className="mt-1 size-5 accent-rose-300"
        />
        <span>
          <span className="block font-bold">Permitir Curtidas</span>
          <span className="mt-1 block text-sm leading-6 text-white/50">
            Exibe ❤️ na galeria e nos Momentos ao Vivo.
          </span>
        </span>
      </label>

      <label className="mt-3 flex items-start gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">
        <input
          type="checkbox"
          checked={allowMediaShare}
          disabled={isSaving}
          onChange={(event) => setAllowMediaShare(event.target.checked)}
          className="mt-1 size-5 accent-rose-300"
        />
        <span>
          <span className="block font-bold">Permitir compartilhamento de mídias</span>
          <span className="mt-1 block text-sm leading-6 text-white/50">
            Exibe ↗ para compartilhar o link individual (/video/id). Padrão:
            ativado.
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
        className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-white px-7 text-sm font-black text-slate-950 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? "Salvando..." : "Salvar interações"}
      </button>
    </section>
  );
}
