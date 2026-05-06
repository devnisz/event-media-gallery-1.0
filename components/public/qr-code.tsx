import Image from "next/image";

type QrCodeProps = {
  label: string;
  value: string;
  imagePath?: string;
};

function isAbsoluteHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

export function QrCode({ label, value, imagePath }: QrCodeProps) {
  const src = imagePath?.trim() ?? "";
  const hasImage = src.length > 0;
  const useRemoteImg = hasImage && isAbsoluteHttpUrl(src);
  /** Só `next/image` para ficheiros em `public/` (`/`). Outros paths quebram o otimizer no SSR. */
  const useNextImage = hasImage && !useRemoteImg && src.startsWith("/");

  return (
    <div className="flex items-center gap-5 rounded-[1.75rem] border border-white/10 bg-black/70 p-4 shadow-2xl shadow-black/40 backdrop-blur-2xl">
      {hasImage ? (
        useRemoteImg || !useNextImage ? (
          // URLs absolutas (ex.: R2) ou paths não-public: evita `Image` a falhar no build/SSR
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={`QR Code para ${label}`}
            width={112}
            height={112}
            className="size-28 rounded-2xl bg-white p-2 object-contain"
          />
        ) : (
          <Image
            src={src}
            alt={`QR Code para ${label}`}
            width={112}
            height={112}
            className="size-28 rounded-2xl bg-white p-2"
          />
        )
      ) : (
        <div
          className="flex size-28 flex-col items-center justify-center rounded-2xl border border-dashed border-white/25 bg-white/5 p-3 text-center"
          role="img"
          aria-label="QR Code indisponível"
        >
          <span className="text-[10px] font-semibold uppercase leading-tight tracking-wider text-white/55">
            Sem imagem de QR
          </span>
        </div>
      )}
      <div className="hidden sm:block">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-200">
          QR Code
        </p>
        <p className="mt-1 text-lg font-semibold text-white">{label}</p>
        <p className="mt-1 max-w-72 truncate text-sm text-white/55">{value}</p>
      </div>
    </div>
  );
}
