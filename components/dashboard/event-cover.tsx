type EventCoverProps = {
  src: string | null;
  name: string;
  className?: string;
};

export function EventCover({ src, name, className = "" }: EventCoverProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-gradient-to-br from-amber-300/30 via-fuchsia-500/20 to-slate-950 ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`Capa do evento ${name}`}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_28%),linear-gradient(135deg,rgba(251,191,36,0.18),rgba(217,70,239,0.16),rgba(15,23,42,0.9))]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute bottom-4 left-4 right-4">
        <p className="line-clamp-2 text-lg font-black leading-tight text-white">
          {name}
        </p>
      </div>
    </div>
  );
}
