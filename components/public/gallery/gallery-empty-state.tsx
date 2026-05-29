export function GalleryEmptyState() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]">
        <span className="size-2 rounded-full bg-emerald-400 animate-live-pulse" />
      </div>
      <h2 className="text-xl font-black text-white">Galeria ao vivo</h2>
      <p className="mt-2 text-sm leading-6 text-white/45">
        As mídias aparecem aqui assim que forem enviadas. Fique nesta página —
        tudo chega em tempo real.
      </p>
    </div>
  );
}
