"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { GalleryMediaRecord, MediaReviewStatus } from "@/types/media";
import { AdminToast, type AdminToastState } from "@/components/admin/admin-toast";

type PendingGuestUploadsProps = {
  initialUploads: GalleryMediaRecord[];
};

function mediaDate(media: GalleryMediaRecord): string {
  const value = media.uploadedAt ?? media.createdAt ?? media.timestamp;
  const timestamp = value ? Date.parse(value) : NaN;

  if (!Number.isFinite(timestamp)) {
    return "Sem data";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function mediaPreview(media: GalleryMediaRecord): string | undefined {
  return (
    media.thumbnailUrl ?? (media.mediaType !== "video" ? media.url : undefined)
  );
}

export function PendingGuestUploads({
  initialUploads,
}: PendingGuestUploadsProps) {
  const router = useRouter();
  const [uploads, setUploads] = useState(initialUploads);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<AdminToastState>(null);

  function showToast(tone: "success" | "error", message: string) {
    setToast({ tone, message });
    window.setTimeout(() => setToast(null), 3400);
  }

  async function setReviewStatus(
    item: GalleryMediaRecord,
    reviewStatus: Extract<MediaReviewStatus, "approved" | "rejected">,
  ) {
    setBusyId(item.id);

    try {
      const response = await fetch(`/api/media/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível moderar o upload.");
      }

      setUploads((current) => current.filter((upload) => upload.id !== item.id));
      router.refresh();
      showToast(
        "success",
        reviewStatus === "approved" ? "Upload aprovado." : "Upload rejeitado.",
      );
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : "Erro ao moderar upload.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function deleteUpload(item: GalleryMediaRecord) {
    const confirmed = window.confirm(
      `Excluir "${item.name}"?\n\nA mídia sairá do painel e da galeria.`,
    );

    if (!confirmed) {
      return;
    }

    setBusyId(item.id);

    try {
      const response = await fetch(`/api/media/${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível excluir o upload.");
      }

      setUploads((current) => current.filter((upload) => upload.id !== item.id));
      router.refresh();
      showToast("success", "Upload excluído.");
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : "Erro ao excluir upload.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-[2rem] border border-amber-300/15 bg-amber-300/[0.04] p-6">
      <AdminToast toast={toast} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-200">
            Moderação
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">
            Uploads pendentes
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/50">
            Aprove, rejeite ou exclua mídias enviadas por convidados antes de
            aparecerem na galeria pública.
          </p>
        </div>
        <span className="w-fit rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-sm font-black text-amber-100">
          {uploads.length} pendente(s)
        </span>
      </div>

      {uploads.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-black/20 p-6 text-sm text-white/50">
          Nenhum upload de convidado aguardando aprovação.
        </div>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {uploads.map((item) => {
            const preview = mediaPreview(item);
            const busy = busyId === item.id;

            return (
              <article
                key={item.id}
                className="grid gap-4 rounded-[1.5rem] border border-white/10 bg-black/25 p-4 sm:grid-cols-[8rem_minmax(0,1fr)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-900">
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview}
                      alt={`Prévia de ${item.name}`}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-sm font-bold text-white/45">
                      {item.mediaType.toUpperCase()}
                    </div>
                  )}
                  <span className="absolute left-2 top-2 rounded-full bg-amber-300 px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-wider text-slate-950">
                    Pendente
                  </span>
                </div>

                <div className="min-w-0 space-y-3">
                  <div>
                    <h3 className="line-clamp-2 font-black">{item.name}</h3>
                    <p className="mt-1 text-sm text-white/45">
                      {item.mediaType.toUpperCase()} · {mediaDate(item)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void setReviewStatus(item, "approved")}
                      className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busy ? "Salvando..." : "Aprovar"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void setReviewStatus(item, "rejected")}
                      className="rounded-full border border-rose-300/35 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Rejeitar
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void deleteUpload(item)}
                      className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
