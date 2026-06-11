"use client";

import Link from "next/link";
import { Heart, ImageIcon, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { GalleryMediaRecord, MediaKind } from "@/types/media";
import { AdminToast, type AdminToastState } from "@/components/admin/admin-toast";
import { formatMetricNumber } from "@/lib/dashboard/engagement-metrics";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

type EventMediaManagerProps = {
  initialMedia: GalleryMediaRecord[];
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

function mediaTypeLabel(type: MediaKind): string {
  if (type === "video") return "Vídeo";
  if (type === "image") return "Foto";
  if (type === "boomerang") return "Boomerang";
  return "GIF";
}

function mediaPreview(media: GalleryMediaRecord): string | undefined {
  return media.thumbnailUrl ?? (media.mediaType !== "video" ? media.url : undefined);
}

export function EventMediaManager({ initialMedia }: EventMediaManagerProps) {
  const router = useRouter();
  const [media, setMedia] = useState(initialMedia);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<AdminToastState>(null);

  function showToast(tone: "success" | "error", message: string) {
    setToast({ tone, message });
    window.setTimeout(() => setToast(null), 3400);
  }

  async function updateMedia(
    id: string,
    patch: { isHidden?: boolean; isFavorite?: boolean },
    successMessage: string,
  ) {
    setBusyId(id);

    try {
      const res = await fetch(`/api/media/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as {
        error?: string;
        media?: GalleryMediaRecord;
      };

      if (!res.ok || !data.media) {
        throw new Error(data.error ?? "Não foi possível atualizar a mídia.");
      }

      setMedia((current) =>
        current.map((item) => (item.id === id ? data.media! : item)),
      );
      router.refresh();
      showToast("success", successMessage);
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : "Erro ao atualizar mídia.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function deleteMedia(item: GalleryMediaRecord) {
    const confirmed = window.confirm(
      "Excluir esta mídia?\n\nEla sairá do painel e da galeria, mas o arquivo no R2 não será apagado agora.",
    );

    if (!confirmed) {
      return;
    }

    setBusyId(item.id);

    try {
      const res = await fetch(`/api/media/${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "Não foi possível excluir a mídia.");
      }

      setMedia((current) => current.filter((mediaItem) => mediaItem.id !== item.id));
      router.refresh();
      showToast("success", "Mídia excluída do painel.");
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : "Erro ao excluir mídia.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="space-y-5">
      <AdminToast toast={toast} />

      {media.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.04] px-8 py-14 text-center">
          <p className="text-lg font-black">Nenhuma mídia recebida ainda</p>
          <p className="mt-2 text-sm text-white/50">
            Assim que o watcher enviar arquivos, eles aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {media.map((item) => {
            const preview = mediaPreview(item);
            const busy = busyId === item.id;
            const likes = item.likesCount ?? 0;

            return (
              <article
                key={item.id}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition hover:border-white/15 hover:bg-white/[0.06]"
              >
                <div className="relative aspect-[4/5] bg-gradient-to-br from-slate-800 to-slate-950">
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-white/20">
                      {item.mediaType === "video" ? (
                        <Video className="size-10" />
                      ) : (
                        <ImageIcon className="size-10" />
                      )}
                    </div>
                  )}

                  <div className="absolute inset-x-0 top-0 flex flex-wrap gap-1.5 p-2.5">
                    {item.isFavorite ? (
                      <span className="rounded-full bg-amber-300/95 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-950">
                        Favorita
                      </span>
                    ) : null}
                    {item.isHidden ? (
                      <span className="rounded-full bg-rose-500/90 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                        Oculta
                      </span>
                    ) : null}
                    {item.reviewStatus !== "approved" ? (
                      <span className="rounded-full bg-amber-300/95 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-950">
                        {item.reviewStatus === "pending" ? "Pendente" : "Rejeitada"}
                      </span>
                    ) : null}
                    {item.mediaSource === "guest" ? (
                      <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-sm">
                        Convidado
                      </span>
                    ) : null}
                  </div>

                  {likes > 0 ? (
                    <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                      <Heart className="size-3 fill-rose-400 text-rose-400" />
                      {formatMetricNumber(likes)}
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3 p-3.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-white">
                      {mediaTypeLabel(item.mediaType)}
                    </p>
                    <p className="shrink-0 text-xs text-white/40">{mediaDate(item)}</p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void updateMedia(
                          item.id,
                          { isFavorite: !item.isFavorite },
                          item.isFavorite
                            ? "Mídia removida dos destaques."
                            : "Mídia destacada como favorita.",
                        )
                      }
                      className={cn(
                        "rounded-full px-3 py-1.5 text-[11px] font-bold transition disabled:opacity-50",
                        item.isFavorite
                          ? "border border-amber-300/30 bg-amber-300/10 text-amber-100"
                          : "border border-white/10 text-white/70 hover:bg-white/10",
                      )}
                    >
                      {item.isFavorite ? "Destaque" : "Destacar"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void updateMedia(
                          item.id,
                          { isHidden: !item.isHidden },
                          item.isHidden
                            ? "Mídia voltou para a galeria pública."
                            : "Mídia ocultada da galeria pública.",
                        )
                      }
                      className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-bold text-white/70 transition hover:bg-white/10 disabled:opacity-50"
                    >
                      {item.isHidden ? "Reexibir" : "Ocultar"}
                    </button>
                    <Link
                      href={routes.media(item.id)}
                      className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-bold text-white/70 transition hover:bg-white/10"
                    >
                      Abrir
                    </Link>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void deleteMedia(item)}
                      className="rounded-full border border-rose-300/20 px-3 py-1.5 text-[11px] font-bold text-rose-200/90 transition hover:bg-rose-500/10 disabled:opacity-50"
                    >
                      {busy ? "…" : "Excluir"}
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
