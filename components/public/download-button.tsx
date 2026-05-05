/**
 * Link de download na mesma aba (`download` + nome sugerido). Sem `target="_blank"`.
 */
type DownloadButtonProps = {
  href: string;
  /** Rótulo do botão (ex.: vídeo vs imagem). */
  label?: string;
  /**
   * Valor do atributo HTML `download` (nome sugerido do arquivo).
   * Evite `/`, `\\` e caracteres reservados do SO.
   */
  fileName?: string;
};

export function DownloadButton({
  href,
  label = "Baixar mídia",
  fileName,
}: DownloadButtonProps) {
  const trimmed = fileName?.trim();
  const downloadAttr =
    trimmed && trimmed.length > 0 ? trimmed : true;

  return (
    <a
      href={href}
      download={downloadAttr}
      className="inline-flex min-h-16 items-center justify-center rounded-full bg-white px-8 text-lg font-bold text-slate-950 shadow-[0_18px_60px_rgba(255,255,255,0.2)] transition duration-300 hover:scale-105 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/50 active:scale-95"
    >
      {label}
    </a>
  );
}
