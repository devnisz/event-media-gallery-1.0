"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DashboardEventSummary } from "@/lib/dashboard/queries";
import { AdminToast, type AdminToastState } from "@/components/admin/admin-toast";
import { EventCover } from "@/components/dashboard/event-cover";
import { formatWatcherCredentialsSnippet } from "@/lib/watcher/format-credentials";
import { routes } from "@/lib/routes";

type DashboardEventsOverviewProps = {
  initialEvents: DashboardEventSummary[];
};

function formatDate(value: string): string {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return "Sem data";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export function DashboardEventsOverview({
  initialEvents,
}: DashboardEventsOverviewProps) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [toast, setToast] = useState<AdminToastState>(null);

  function showToast(tone: "success" | "error", message: string) {
    setToast({ tone, message });
    window.setTimeout(() => setToast(null), 3400);
  }

  async function createEvent() {
    const trimmed = name.trim();

    if (!trimmed) {
      showToast("error", "Informe um nome para o evento.");
      return;
    }

    setIsCreating(true);

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = (await res.json()) as {
        error?: string;
        errorDetail?: string;
      };

      if (!res.ok) {
        const parts = [data.error, data.errorDetail].filter(Boolean);
        throw new Error(parts.join(" — ") || "Falha ao criar evento.");
      }

      setName("");
      router.refresh();
      showToast("success", "Evento criado com sucesso.");
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : "Erro ao criar evento.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function copyCredentials(event: DashboardEventSummary) {
    try {
      await navigator.clipboard.writeText(formatWatcherCredentialsSnippet(event));
      showToast("success", "Credenciais do watcher copiadas.");
    } catch {
      showToast("error", "Não foi possível copiar as credenciais.");
    }
  }

  async function deleteEvent(event: DashboardEventSummary) {
    const confirmed = window.confirm(
      `Excluir o evento "${event.name}"?\n\nEsta ação remove o evento e as mídias vinculadas.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      const res = await fetch(`/api/events/${encodeURIComponent(event.id)}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "Falha ao excluir evento.");
      }

      setEvents((current) => current.filter((item) => item.id !== event.id));
      router.refresh();
      showToast("success", "Evento excluído.");
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : "Erro ao excluir evento.",
      );
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-10 pb-16">
      <AdminToast toast={toast} />

      <section className="flex flex-col gap-6 rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-200">
            Dashboard do cliente
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">
            Seus eventos
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">
            Acompanhe mídias, acesse links públicos e gerencie a experiência de
            cada evento.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={isCreating}
            placeholder="Nome do novo evento"
            className="min-h-12 rounded-2xl border border-white/12 bg-black/30 px-4 text-white outline-none placeholder:text-white/35 focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/20 disabled:opacity-60 sm:min-w-72"
          />
          <button
            type="button"
            disabled={isCreating}
            onClick={() => void createEvent()}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-r from-amber-300 via-orange-400 to-fuchsia-500 px-7 text-sm font-black uppercase tracking-widest text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCreating ? "Criando..." : "Novo evento"}
          </button>
        </div>
      </section>

      {events.length === 0 ? (
        <section className="rounded-[2.5rem] border border-dashed border-white/15 bg-white/[0.04] px-8 py-20 text-center">
          <p className="text-2xl font-black text-white">
            Nenhum evento cadastrado
          </p>
          <p className="mx-auto mt-3 max-w-xl text-white/55">
            Crie seu primeiro evento para começar a receber uploads pelo watcher
            e compartilhar a galeria pública.
          </p>
        </section>
      ) : (
        <section className="grid gap-5 lg:grid-cols-2">
          {events.map((event) => (
            <article
              key={event.id}
              className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.05] shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
            >
              <EventCover
                src={event.displayCover}
                name={event.name}
                className="h-52 rounded-none border-0"
              />
              <div className="space-y-5 p-6">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">
                    {event.name}
                  </h2>
                  <p className="mt-1 font-mono text-sm text-white/45">
                    {event.slug}
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                  <div className="rounded-2xl bg-black/25 p-3">
                    <dt className="text-white/40">Mídias</dt>
                    <dd className="mt-1 text-xl font-black">{event.mediaCount}</dd>
                  </div>
                  <div className="rounded-2xl bg-black/25 p-3">
                    <dt className="text-white/40">Favoritas</dt>
                    <dd className="mt-1 text-xl font-black">
                      {event.favoriteCount}
                    </dd>
                  </div>
                  <div className="rounded-2xl bg-black/25 p-3">
                    <dt className="text-white/40">Ocultas</dt>
                    <dd className="mt-1 text-xl font-black">{event.hiddenCount}</dd>
                  </div>
                  <div className="rounded-2xl bg-black/25 p-3">
                    <dt className="text-white/40">Atualizado</dt>
                    <dd className="mt-1 text-xs font-bold leading-5">
                      {formatDate(event.lastUpdatedAt)}
                    </dd>
                  </div>
                </dl>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={routes.dashboardEvent(event.id)}
                    className="inline-flex flex-1 items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-100 sm:flex-none"
                  >
                    Gerenciar evento
                  </Link>
                  <Link
                    href={routes.event(event.slug)}
                    className="inline-flex flex-1 items-center justify-center rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10 sm:flex-none"
                  >
                    Galeria pública
                  </Link>
                  <button
                    type="button"
                    onClick={() => void copyCredentials(event)}
                    className="inline-flex flex-1 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-300/10 px-5 py-3 text-sm font-bold text-emerald-100 transition hover:bg-emerald-300/15 sm:flex-none"
                  >
                    Copiar watcher
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteEvent(event)}
                    className="inline-flex flex-1 items-center justify-center rounded-full border border-rose-300/25 bg-rose-500/10 px-5 py-3 text-sm font-bold text-rose-100 transition hover:bg-rose-500/20 sm:flex-none"
                  >
                    Excluir evento
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
