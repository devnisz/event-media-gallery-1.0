"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { GalleryMediaRecord } from "@/types/media";
import { AdminToast, type AdminToastState } from "@/components/admin/admin-toast";
import { routes } from "@/lib/routes";

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
      `Excluir "${item.name}"?\n\nA mídia sairá do painel e da galeria, mas o arquivo no R2 não será apagado agora.`,
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
      <div>
        <h2 className="text-2xl font-black tracking-tight">Mídias do evento</h2>
        <p className="mt-2 text-sm text-white/50">
          Oculte da galeria pública, destaque favoritas ou exclua do app sem
          apagar arquivos do R2.
        </p>
      </div>

      {media.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-white/15 bg-white/[0.04] px-8 py-16 text-center">
          <p className="text-xl font-black">Nenhuma mídia recebida ainda</p>
          <p className="mt-2 text-white/50">
            Assim que o watcher enviar arquivos, eles aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {media.map((item) => {
            const preview = mediaPreview(item);
            const busy = busyId === item.id;

            return (
              <article
                key={item.id}
                className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.05] shadow-[0_20px_70px_rgba(0,0,0,0.24)]"
              >
                <div className="relative aspect-[16/10] bg-gradient-to-br from-slate-800 to-slate-950">
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview}
                      alt={`Prévia de ${item.name}`}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2),transparent_30%)]" />
                  )}
                  <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                    {item.isFavorite ? (
                      <span className="rounded-full bg-amber-300 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-950">
                        Favorita
                      </span>
                    ) : null}
                    {item.isHidden ? (
                      <span className="rounded-full bg-rose-500 px-3 py-1 text-xs font-black uppercase tracking-wider text-white">
                        Oculta
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-4 p-5">
                  <div>
                    <h3 className="line-clamp-2 text-lg font-black">
                      {item.name}
                    </h3>
                    <p className="mt-1 text-sm text-white/45">
                      {item.mediaType.toUpperCase()} · {mediaDate(item)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
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
                      className="rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-xs font-bold text-amber-100 transition hover:bg-amber-300/15 disabled:opacity-50"
                    >
                      {item.isFavorite ? "Remover destaque" : "Destacar"}
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
                      className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white/80 transition hover:bg-white/10 disabled:opacity-50"
                    >
                      {item.isHidden ? "Reexibir" : "Ocultar"}
                    </button>
                    <Link
                      href={routes.video(item.id)}
                      className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white/80 transition hover:bg-white/10"
                    >
                      Abrir
                    </Link>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void deleteMedia(item)}
                      className="rounded-full border border-rose-300/30 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-100 transition hover:bg-rose-500/20 disabled:opacity-50"
                    >
                      {busy ? "Salvando..." : "Excluir"}
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
