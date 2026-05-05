import type { EventVideo } from "@/types/video";

type VideoThumbnailProps = {
  video: EventVideo;
  isLarge?: boolean;
  variant?: "landscape" | "vertical";
  /**
   * Quando verdadeiro, preenche o pai (altura/largura) sem aplicar aspect-ratio próprio.
   * Uso típico: fundo do player em caixa já com aspect-[9/16].
   */
  fillParent?: boolean;
};

function PlayGlyph() {
  return (
    <span className="ml-1 h-0 w-0 border-y-[11px] border-l-[17px] border-y-transparent border-l-white" />
  );
}

function ImageGlyph() {
  return (
    <svg
      aria-hidden
      className="size-7 text-white"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

export function VideoThumbnail({
  video,
  isLarge = false,
  variant = "landscape",
  fillParent = false,
}: VideoThumbnailProps) {
  const isVertical = variant === "vertical";
  const layoutClass = fillParent
    ? "h-full min-h-0 w-full"
    : isLarge
      ? "aspect-video"
      : isVertical
        ? "aspect-[9/16]"
        : "aspect-[16/10]";
  const imageClass = isVertical ? "object-contain" : "object-cover";

  const thumb =
    video.thumbnailUrl ??
    video.thumbnail ??
    (video.mediaType !== "video" ? video.url : undefined);

  const showVideoChrome = video.mediaType === "video";

  const radiusClass = fillParent ? "rounded-[inherit]" : "rounded-[2rem]";

  return (
    <div
      className={`relative overflow-hidden ${radiusClass} bg-gradient-to-br ${video.accent} ${layoutClass}`}
    >
      {thumb ? (
        <>
          {isVertical ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb}
              alt=""
              className="absolute inset-0 h-full w-full scale-110 object-cover opacity-45 blur-2xl"
              aria-hidden
            />
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumb}
            alt={`Prévia de ${video.title}`}
            loading="lazy"
            className={`absolute inset-0 h-full w-full ${imageClass} transition-transform duration-500 group-hover:scale-[1.02]`}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.2),transparent_45%)] opacity-90" />
      )}
      {!fillParent ? (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.34),transparent_24%),linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.14)_42%,rgba(0,0,0,0.72))]" />
          <div className="absolute inset-x-7 top-7 h-px bg-white/35" />
          <div className="absolute left-7 top-9 h-24 w-24 rounded-full border border-white/30 bg-white/10 blur-sm" />
          <div
            className={`absolute grid place-items-center rounded-full border border-white/30 bg-black/35 text-white shadow-2xl backdrop-blur-xl transition duration-500 group-hover:scale-110 group-hover:bg-white/20 ${
              isVertical
                ? "bottom-8 right-8 h-16 w-16"
                : "bottom-7 right-7 h-16 w-16"
            }`}
          >
            {showVideoChrome ? <PlayGlyph /> : <ImageGlyph />}
          </div>
          {!isVertical ? (
            <div className="absolute bottom-7 left-7">
              <div className="mb-3 h-2 w-24 rounded-full bg-white/55" />
              <div className="h-2 w-40 rounded-full bg-white/25" />
            </div>
          ) : null}
        </>
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/40" />
      )}
    </div>
  );
}
