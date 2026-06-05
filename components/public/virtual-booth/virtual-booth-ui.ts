import { cn } from "@/lib/utils";

/** Estilos compartilhados da Cabine Virtual (consistência visual). */
export const boothShellClass =
  "relative flex min-h-[100dvh] flex-col bg-neutral-950 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-8";

export const boothCloseButtonClass =
  "absolute right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))] z-20 grid size-10 place-items-center rounded-full border border-white/[0.08] bg-white/[0.03] text-lg text-white/55 transition hover:border-white/15 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25";

export const boothTitleClass =
  "text-[1.375rem] font-semibold tracking-[-0.03em] text-white sm:text-[1.5rem]";

export const boothSubtitleClass =
  "mt-1.5 text-sm leading-snug text-white/36";

export const boothPreviewFrameClass =
  "flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[1.125rem] border border-white/[0.08] bg-black/80 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:rounded-2xl sm:p-3";

export function boothPrimaryButtonClass(className?: string) {
  return cn(
    "inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-white px-5 text-[0.9375rem] font-semibold tracking-[-0.01em] text-neutral-950 transition",
    "hover:bg-white/95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
    className,
  );
}

export function boothSecondaryButtonClass(className?: string) {
  return cn(
    "inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-white/[0.08] bg-transparent px-4 text-sm font-medium text-white/50 transition",
    "hover:border-white/14 hover:bg-white/[0.03] hover:text-white/72 active:scale-[0.99]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
    className,
  );
}

export function boothGhostButtonClass(className?: string) {
  return cn(
    "inline-flex min-h-10 w-full items-center justify-center text-sm font-medium text-white/40 transition hover:text-white/62",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
    className,
  );
}
