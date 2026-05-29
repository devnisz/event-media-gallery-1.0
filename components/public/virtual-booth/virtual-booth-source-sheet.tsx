type VirtualBoothSourceSheetProps = {
  open: boolean;
  variant: "photo" | "video";
  showCamera: boolean;
  showGallery: boolean;
  /** Dentro do `<dialog>` — evita ficar atrás da top layer do modal nativo. */
  embedded?: boolean;
  onCamera: () => void;
  onGallery: () => void;
  onDismiss: () => void;
};

function SourceRow({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-[0.95rem] font-semibold text-white transition hover:bg-white/[0.06] active:bg-white/[0.09]"
    >
      <span className="text-lg leading-none" aria-hidden>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

export function VirtualBoothSourceSheet({
  open,
  variant,
  showCamera,
  showGallery,
  embedded = false,
  onCamera,
  onGallery,
  onDismiss,
}: VirtualBoothSourceSheetProps) {
  if (!open || (!showCamera && !showGallery)) {
    return null;
  }

  const cameraLabel = variant === "photo" ? "Tirar Foto" : "Gravar Vídeo";
  const galleryLabel =
    variant === "photo" ? "Escolher da Galeria" : "Escolher Vídeo";
  const cameraIcon = variant === "photo" ? "📸" : "🎥";
  const galleryIcon = variant === "photo" ? "🖼" : "📂";

  const overlayClass = embedded
    ? "absolute inset-0 z-50 flex items-end justify-center p-4"
    : "fixed inset-0 z-[60] flex items-end justify-center p-4 sm:p-6";

  return (
    <div className={overlayClass}>
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onDismiss}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-slate-950/98 shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
      >
        <div className="px-2 py-2">
          {showCamera ? (
            <SourceRow
              icon={cameraIcon}
              label={cameraLabel}
              onClick={onCamera}
            />
          ) : null}
          {showCamera && showGallery ? (
            <div className="mx-4 h-px bg-white/8" aria-hidden />
          ) : null}
          {showGallery ? (
            <SourceRow
              icon={galleryIcon}
              label={galleryLabel}
              onClick={onGallery}
            />
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="w-full border-t border-white/8 py-3.5 text-sm font-semibold text-white/45 transition hover:bg-white/[0.04] hover:text-white/70"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
