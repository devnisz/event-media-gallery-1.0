"use client";

import { useMemo, useState } from "react";
import type { EventVideo } from "@/types/video";
import { VideoCard } from "./video-card";

type VideoGalleryProps = {
  initialVideos: EventVideo[];
};

export function VideoGallery({
  initialVideos,
}: VideoGalleryProps) {
  const [videos, setVideos] = useState(initialVideos);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  const visibleVideoCount = useMemo(
    () => videos.length - removingIds.size,
    [removingIds.size, videos.length],
  );

  function handleDeleted(id: string) {
    setRemovingIds((current) => new Set(current).add(id));

    window.setTimeout(() => {
      setVideos((current) => current.filter((video) => video.id !== id));
      setRemovingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }, 260);
  }

  return (
    <section className="mx-auto flex w-full max-w-[1900px] flex-col gap-10">
      <header className="animate-rise flex flex-col justify-between gap-8 rounded-[2.5rem] border border-white/10 bg-white/[0.06] p-7 shadow-[0_28px_90px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-10 xl:flex-row xl:items-end">
        <div className="max-w-5xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.36em] text-amber-200">
            Sua coleção de memórias
          </p>
          <h2 className="text-4xl font-black tracking-[-0.05em] sm:text-6xl xl:text-7xl">
            Momentos à sua escolha.
          </h2>
          <p className="mt-6 max-w-3xl text-xl leading-9 text-white/68 sm:text-2xl">
            Navegue com naturalidade, reveja cada destaque e compartilhe com
            quem faz parte da história — tudo com o cuidado visual que a
            ocasião merece.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center sm:min-w-[28rem]">
          <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
            <strong className="block text-3xl">{visibleVideoCount}</strong>
            <span className="text-sm uppercase tracking-[0.22em] text-white/50">
              mídias
            </span>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
            <strong className="block text-3xl">4K</strong>
            <span className="text-sm uppercase tracking-[0.22em] text-white/50">
              ready
            </span>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
            <strong className="block text-3xl">43 in</strong>
            <span className="text-sm uppercase tracking-[0.22em] text-white/50">
              touch
            </span>
          </div>
        </div>
      </header>

      {videos.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,17rem),1fr))] gap-6 lg:gap-7">
          {videos.map((video, index) => (
            <VideoCard
              key={video.id}
              video={video}
              index={index}
              isRemoving={removingIds.has(video.id)}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      ) : (
        <div className="animate-rise rounded-[2.5rem] border border-white/10 bg-white/[0.06] p-10 text-center shadow-[0_24px_80px_rgba(0,0,0,0.3)] backdrop-blur-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-amber-200">
            Galeria vazia
          </p>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white">
            Nenhuma mídia disponível.
          </h2>
          <p className="mt-4 text-lg text-white/60">
            Novos uploads aparecerao aqui automaticamente.
          </p>
        </div>
      )}
    </section>
  );
}
