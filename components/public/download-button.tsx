type DownloadButtonProps = {
  href: string;
  /** Rótulo do botão (ex.: vídeo vs imagem). */
  label?: string;
};

export function DownloadButton({
  href,
  label = "Baixar mídia",
}: DownloadButtonProps) {
  return (
    <a
      href={href}
      download
      className="inline-flex min-h-16 items-center justify-center rounded-full bg-white px-8 text-lg font-bold text-slate-950 shadow-[0_18px_60px_rgba(255,255,255,0.2)] transition duration-300 hover:scale-105 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/50 active:scale-95"
    >
      {label}
    </a>
  );
}
