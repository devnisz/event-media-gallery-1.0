import type { MediaKind } from "@/types/media";

const LABELS: Record<MediaKind, string> = {
  video: "VIDEO",
  image: "FOTO",
  gif: "GIF",
};

const VARIANTS: Record<
  MediaKind,
  string
> = {
  video:
    "border-cyan-300/35 bg-cyan-400/15 text-cyan-50 shadow-[0_12px_40px_rgba(34,211,238,0.18)]",
  image:
    "border-fuchsia-300/35 bg-fuchsia-500/15 text-fuchsia-50 shadow-[0_12px_40px_rgba(217,70,239,0.18)]",
  gif:
    "border-amber-300/40 bg-amber-400/18 text-amber-50 shadow-[0_12px_40px_rgba(251,191,36,0.22)]",
};

type MediaBadgeProps = {
  kind: MediaKind;
  size?: "sm" | "md";
  className?: string;
};

export function MediaBadge({ kind, size = "md", className = "" }: MediaBadgeProps) {
  const sizing =
    size === "sm"
      ? "px-2.5 py-1 text-[10px] tracking-[0.2em]"
      : "px-3.5 py-1.5 text-[11px] tracking-[0.28em]";

  return (
    <span
      className={`inline-flex items-center rounded-full border font-black uppercase backdrop-blur-md ${VARIANTS[kind]} ${sizing} ${className}`}
    >
      {LABELS[kind]}
    </span>
  );
}
