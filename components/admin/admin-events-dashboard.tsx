"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type { GalleryEventRecord } from "@/types/event";
import { AdminToast, type AdminToastState } from "@/components/admin/admin-toast";
import { formatWatcherCredentialsSnippet } from "@/lib/watcher/format-credentials";
import { routes } from "@/lib/routes";

type AdminEventsDashboardProps = {
  initialEvents: GalleryEventRecord[];
};

function CopyIcon() {
  return (
    <svg
      aria-hidden
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      aria-hidden
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

type EventDeletionReportApi = {
  videosRemoved: number;
  localVideoFilesRemoved: number;
  localThumbnailsRemoved: number;
  localQrCodesRemoved: number;
  r2ObjectsRemoved: number;
  r2Errors: string[];
  durationMs: number;
  logs: string[];
};

export function AdminEventsDashboard({
  initialEvents,
}: AdminEventsDashboardProps) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [createOpen, setCreateOpen] = useState(false);
  const [credentialsEvent, setCredentialsEvent] =
    useState<GalleryEventRecord | null>(null);
  const [deleteConfirmEvent, setDeleteConfirmEvent] =
    useState<GalleryEventRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<AdminToastState>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const createDialogRef = useRef<HTMLDialogElement>(null);
  const credDialogRef = useRef<HTMLDialogElement>(null);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const createTitleId = useId();
  const credTitleId = useId();
  const deleteTitleId = useId();

  useEffect(() => {
    const d = createDialogRef.current;
    if (!d) return;
    if (createOpen) d.showModal();
    else d.close();
  }, [createOpen]);

  useEffect(() => {
    const d = credDialogRef.current;
    if (!d) return;
    if (credentialsEvent) d.showModal();
    else d.close();
  }, [credentialsEvent]);

  useEffect(() => {
    const d = deleteDialogRef.current;
    if (!d) return;
    if (deleteConfirmEvent) d.showModal();
    else d.close();
  }, [deleteConfirmEvent]);

  function showToast(tone: "success" | "error", message: string) {
    setToast({ tone, message });
    window.setTimeout(() => setToast(null), 3400);
  }

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Informe um nome para o evento.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = (await res.json()) as {
        error?: string;
        event?: GalleryEventRecord;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Falha ao criar evento.");
      }
      if (!data.event) {
        throw new Error("Resposta invalida do servidor.");
      }
      setEvents((prev) => [data.event!, ...prev]);
      setName("");
      setCreateOpen(false);
      setCredentialsEvent(data.event);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar.");
    } finally {
      setLoading(false);
    }
  }

  async function copySnippet(event: GalleryEventRecord) {
    const text = formatWatcherCredentialsSnippet(event);
    try {
      await navigator.clipboard.writeText(text);
      showToast("success", "Credenciais copiadas para a área de transferência.");
    } catch {
      showToast(
        "error",
        "Não foi possível copiar. Selecione o texto manualmente ou use HTTPS.",
      );
    }
  }

  function closeCredentials() {
    setCredentialsEvent(null);
  }

  function closeDeleteConfirm() {
    if (deletingId) return;
    setDeleteConfirmEvent(null);
  }

  async function confirmDeleteEvent() {
    const target = deleteConfirmEvent;
    if (!target || deletingId) return;

    setDeletingId(target.id);

    try {
      const res = await fetch(
        `/api/events/${encodeURIComponent(target.id)}`,
        { method: "DELETE" },
      );

      const data = (await res.json()) as {
        error?: string;
        report?: EventDeletionReportApi;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Falha ao excluir evento.");
      }

      const report = data.report;

      if (!report) {
        throw new Error("Resposta inválida do servidor.");
      }

      const summary = [
        `${report.videosRemoved} vídeo(s) no JSON`,
        `${report.localVideoFilesRemoved} arquivo(s) de vídeo locais`,
        `${report.localThumbnailsRemoved} thumbnail(s)`,
        `${report.localQrCodesRemoved} QR`,
        `${report.r2ObjectsRemoved} objeto(s) R2`,
        `${report.durationMs} ms`,
      ].join(" · ");

      setEvents((prev) => prev.filter((e) => e.id !== target.id));
      setDeleteConfirmEvent(null);
      router.refresh();

      const msg =
        report.r2Errors.length > 0
          ? `Evento removido: ${summary}. Aviso: ${report.r2Errors.length} erro(s) ao limpar R2 — verifique os logs do servidor.`
          : `Evento removido: ${summary}`;

      showToast("success", msg);
    } catch (e) {
      showToast(
        "error",
        e instanceof Error ? e.message : "Erro ao excluir evento.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-16">
      <AdminToast toast={toast} />

      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-200">
            Operação
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Eventos e watcher
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/58">
            Crie um evento, copie{" "}
            <code className="rounded-md bg-white/10 px-1.5 py-0.5 text-sm text-amber-100">
              EVENT_ID
            </code>{" "}
            e{" "}
            <code className="rounded-md bg-white/10 px-1.5 py-0.5 text-sm text-amber-100">
              UPLOAD_TOKEN
            </code>{" "}
            para o arquivo de configuração do watcher. Integração automática do
            watcher virá na próxima etapa.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError("");
            setCreateOpen(true);
          }}
          className="inline-flex min-h-14 min-w-[12rem] items-center justify-center rounded-full bg-gradient-to-r from-amber-300 via-orange-400 to-fuchsia-500 px-10 text-base font-black text-slate-950 shadow-[0_18px_70px_rgba(251,191,36,0.28)] transition hover:brightness-105 active:scale-[0.98]"
        >
          ➕ Novo evento
        </button>
      </div>

      {events.length === 0 ? (
        <div className="animate-rise relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-white/[0.06] via-slate-900/80 to-black/90 px-8 py-20 text-center shadow-[0_30px_100px_rgba(0,0,0,0.4)]">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="absolute -right-10 bottom-0 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl" />
          </div>
          <div className="relative mx-auto flex max-w-lg flex-col items-center gap-6">
            <div className="grid size-24 place-items-center rounded-3xl border border-white/12 bg-white/[0.05] text-4xl">
              📂
            </div>
            <div className="space-y-3">
              <h3 className="text-3xl font-black tracking-tight">
                Nenhum evento cadastrado
              </h3>
              <p className="text-lg text-white/55">
                Comece criando o primeiro evento. Você receberá o token seguro
                para configurar o watcher.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/20 bg-white/10 px-10 text-base font-bold text-white transition hover:bg-white/16 active:scale-[0.98]"
            >
              Criar primeiro evento
            </button>
          </div>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2">
          {events.map((ev) => (
            <li
              key={ev.id}
              className="animate-rise flex flex-col gap-4 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.25)] backdrop-blur-xl"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200/85">
                  {new Date(ev.createdAt).toLocaleString("pt-BR")}
                </p>
                <h3 className="mt-2 text-2xl font-bold text-white">{ev.name}</h3>
                <p className="mt-1 font-mono text-sm text-white/45">{ev.slug}</p>
              </div>
              <dl className="space-y-2 rounded-2xl border border-white/8 bg-black/30 p-4 font-mono text-xs text-white/65">
                <div className="flex flex-wrap gap-2">
                  <dt className="text-white/40">eventId</dt>
                  <dd className="min-w-0 break-all text-amber-100/95">{ev.id}</dd>
                </div>
                <div className="flex flex-wrap gap-2">
                  <dt className="text-white/40">uploadToken</dt>
                  <dd className="min-w-0 break-all text-emerald-100/90">
                    {ev.uploadToken}
                  </dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={deletingId !== null}
                  onClick={() => copySnippet(ev)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-45 sm:flex-none sm:min-w-[14rem]"
                >
                  <CopyIcon />
                  Copiar credenciais do watcher
                </button>
                <Link
                  href={routes.event(ev.slug)}
                  className="inline-flex flex-1 items-center justify-center rounded-full border border-white/18 px-5 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10 sm:flex-none"
                >
                  Ver galeria pública
                </Link>
                <button
                  type="button"
                  disabled={deletingId !== null}
                  onClick={() => setDeleteConfirmEvent(ev)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-red-400/45 bg-red-500/15 px-5 py-3 text-sm font-bold text-red-100 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-45 sm:flex-none"
                >
                  <TrashIcon />
                  Excluir evento
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <dialog
        ref={createDialogRef}
        aria-labelledby={createTitleId}
        className="fixed inset-0 z-[90] w-[min(94vw,26rem)] max-h-[90dvh] overflow-y-auto rounded-[2rem] border border-white/12 bg-[#070712]/94 p-0 text-white shadow-[0_36px_120px_rgba(0,0,0,0.55)] backdrop-blur-3xl open:animate-rise"
        onCancel={(e) => {
          e.preventDefault();
          setCreateOpen(false);
        }}
        onKeyDown={(e: ReactKeyboardEvent<HTMLDialogElement>) => {
          if (e.key === "Escape") setCreateOpen(false);
        }}
      >
        <div className="relative overflow-hidden px-8 pb-10 pt-10">
          <div className="pointer-events-none absolute inset-0 opacity-55">
            <div className="absolute -left-8 top-0 h-48 w-48 rounded-full bg-amber-400/30 blur-3xl" />
            <div className="absolute -right-12 bottom-0 h-52 w-52 rounded-full bg-fuchsia-500/25 blur-3xl" />
          </div>
          <div className="relative space-y-6">
            <header>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-amber-200">
                Novo evento
              </p>
              <h2 id={createTitleId} className="mt-2 text-2xl font-black">
                Nome do evento
              </h2>
            </header>
            <input
              autoComplete="off"
              disabled={loading}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: 15 anos Olivia"
              className="w-full rounded-2xl border border-white/12 bg-black/40 px-4 py-3.5 text-lg font-semibold outline-none ring-amber-300/30 focus:ring-4 disabled:opacity-50"
            />
            {error ? (
              <p className="text-sm font-semibold text-red-300">{error}</p>
            ) : null}
            <div className="flex gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => setCreateOpen(false)}
                className="flex-1 rounded-full border border-white/15 py-3 text-sm font-semibold text-white/75 hover:bg-white/10 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleCreate}
                className="flex-1 rounded-full bg-white py-3 text-sm font-black text-slate-950 shadow-lg disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <span className="size-4 animate-spin rounded-full border-2 border-slate-400 border-t-slate-900" />
                    Criando…
                  </span>
                ) : (
                  "Criar"
                )}
              </button>
            </div>
          </div>
        </div>
      </dialog>

      <dialog
        ref={deleteDialogRef}
        aria-labelledby={deleteTitleId}
        className="fixed inset-0 z-[92] w-[min(94vw,26rem)] max-h-[90dvh] overflow-y-auto rounded-[2rem] border border-red-400/30 bg-[#140608]/96 p-0 text-white shadow-[0_36px_120px_rgba(0,0,0,0.55)] backdrop-blur-3xl open:animate-rise"
        onCancel={(e) => {
          e.preventDefault();
          closeDeleteConfirm();
        }}
        onKeyDown={(e: ReactKeyboardEvent<HTMLDialogElement>) => {
          if (e.key === "Escape") closeDeleteConfirm();
        }}
      >
        {deleteConfirmEvent ? (
          <div className="relative px-8 pb-10 pt-10">
            <div className="pointer-events-none absolute inset-0 opacity-40">
              <div className="absolute -left-6 top-0 h-44 w-44 rounded-full bg-red-500/35 blur-3xl" />
            </div>
            <div className="relative space-y-6">
              <header>
                <p className="text-xs font-semibold uppercase tracking-[0.34em] text-red-300">
                  Confirmação necessária
                </p>
                <h2 id={deleteTitleId} className="mt-2 text-2xl font-black">
                  Excluir evento?
                </h2>
              </header>
              <p className="text-base leading-relaxed text-white/72">
                Isso remove o evento de{" "}
                <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-sm">
                  events.json
                </code>
                , todos os vídeos ligados em{" "}
                <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-sm">
                  videos.json
                </code>
                , arquivos locais (quando aplicável), objetos no bucket R2 por vídeo e atualiza a galeria pública.{" "}
                <strong className="text-white">Não dá para desfazer.</strong>
              </p>
              <p className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 font-semibold text-white/88">
                {deleteConfirmEvent.name}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={deletingId !== null}
                  onClick={closeDeleteConfirm}
                  className="flex-1 rounded-full border border-white/15 py-3 text-sm font-semibold text-white/75 hover:bg-white/10 disabled:opacity-45"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={deletingId !== null}
                  onClick={confirmDeleteEvent}
                  className="flex-1 rounded-full bg-red-500 py-3 text-sm font-black text-white shadow-lg hover:bg-red-400 disabled:opacity-45"
                >
                  {deletingId ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Excluindo…
                    </span>
                  ) : (
                    "Excluir definitivamente"
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </dialog>

      <dialog
        ref={credDialogRef}
        aria-labelledby={credTitleId}
        className="fixed inset-0 z-[95] w-[min(94vw,32rem)] max-h-[92dvh] overflow-y-auto rounded-[2rem] border border-emerald-400/25 bg-[#06140f]/95 p-0 text-white shadow-[0_36px_120px_rgba(0,0,0,0.5)] backdrop-blur-3xl open:animate-rise"
        onCancel={(e) => {
          e.preventDefault();
          closeCredentials();
        }}
      >
        {credentialsEvent ? (
          <div className="relative px-8 pb-10 pt-10">
            <div className="pointer-events-none absolute inset-0 opacity-40">
              <div className="absolute left-1/4 top-0 h-40 w-40 rounded-full bg-emerald-400/35 blur-3xl" />
            </div>
            <div className="relative space-y-6">
              <header>
                <p className="text-xs font-semibold uppercase tracking-[0.34em] text-emerald-300">
                  Credenciais do watcher
                </p>
                <h2 id={credTitleId} className="mt-2 text-2xl font-black">
                  {credentialsEvent.name}
                </h2>
              </header>
              <dl className="space-y-4 rounded-2xl border border-white/10 bg-black/35 p-5 text-sm">
                <div>
                  <dt className="font-semibold text-white/45">Nome</dt>
                  <dd className="mt-1 font-medium">{credentialsEvent.name}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-white/45">eventId</dt>
                  <dd className="mt-1 break-all font-mono text-amber-100/95">
                    {credentialsEvent.id}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-white/45">slug</dt>
                  <dd className="mt-1 font-mono text-white/75">
                    {credentialsEvent.slug}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-white/45">uploadToken</dt>
                  <dd className="mt-1 break-all font-mono text-emerald-200/95">
                    {credentialsEvent.uploadToken}
                  </dd>
                </div>
              </dl>
              <pre className="max-h-40 overflow-auto rounded-2xl border border-white/10 bg-black/50 p-4 text-left text-xs leading-relaxed text-emerald-100/90">
                {formatWatcherCredentialsSnippet(credentialsEvent)}
              </pre>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => copySnippet(credentialsEvent)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-400 py-3.5 text-base font-black text-slate-950 transition hover:bg-emerald-300"
                >
                  <CopyIcon />
                  Copiar credenciais do watcher
                </button>
                <button
                  type="button"
                  onClick={closeCredentials}
                  className="flex-1 rounded-full border border-white/16 py-3.5 text-base font-semibold text-white/85 hover:bg-white/10"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </dialog>
    </div>
  );
}
