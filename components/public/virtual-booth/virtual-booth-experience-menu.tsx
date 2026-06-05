"use client";

import type { VirtualBoothMenuOption } from "@/lib/virtual-booth/capture-options";
import { cn } from "@/lib/utils";

type VirtualBoothExperienceMenuProps = {
  titleId: string;
  options: VirtualBoothMenuOption[];
  errorMessage?: string;
  onSelect: (optionId: string) => void;
};

/**
 * Seleção de experiência da Cabine Virtual.
 * Grid 2×2 pensado para 3–4 opções (ex.: futura “Fotos com IA”) sem redesign.
 */
export function VirtualBoothExperienceMenu({
  titleId,
  options,
  errorMessage,
  onSelect,
}: VirtualBoothExperienceMenuProps) {
  const optionCount = options.length;
  const usesCenteredLastItem = optionCount === 3;

  return (
    <div className="flex flex-col items-center px-1 pb-2 pt-2 sm:px-2">
      <header className="max-w-md text-center">
        <h2
          id={titleId}
          className="text-[1.65rem] font-semibold tracking-tight text-white sm:text-3xl"
        >
          Escolha sua experiência
        </h2>
        <p className="mt-2 text-sm text-white/40 sm:text-[0.9375rem]">
          Como deseja criar sua lembrança?
        </p>
      </header>

      {errorMessage ? (
        <p
          role="alert"
          className="mt-6 w-full max-w-lg rounded-2xl border border-red-400/20 bg-red-400/[0.08] px-4 py-3 text-center text-sm font-medium text-red-100/90"
        >
          {errorMessage}
        </p>
      ) : null}

      <ul
        className={cn(
          "mt-8 grid w-full max-w-[22rem] grid-cols-2 gap-3 sm:mt-10 sm:max-w-[28rem] sm:gap-4",
          optionCount === 1 && "max-w-[11rem] grid-cols-1",
        )}
        aria-label="Experiências disponíveis"
      >
        {options.map((option, index) => (
          <li
            key={option.id}
            className={cn(
              usesCenteredLastItem &&
                index === optionCount - 1 &&
                "col-span-2 flex justify-center",
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(option.id)}
              aria-label={option.description}
              className={cn(
                "group flex w-full flex-col items-center justify-center gap-3 rounded-[1.35rem] border border-white/[0.07] bg-white/[0.025] px-4 py-7 transition-[transform,background-color,border-color] duration-200",
                "min-h-[9.5rem] touch-manipulation select-none sm:min-h-[10.5rem] sm:gap-4 sm:rounded-[1.5rem] sm:py-8",
                "hover:border-white/[0.12] hover:bg-white/[0.05] active:scale-[0.97] active:bg-white/[0.06]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
                usesCenteredLastItem &&
                  index === optionCount - 1 &&
                  "max-w-[calc(50%-0.375rem)] sm:max-w-[calc(50%-0.5rem)]",
                optionCount === 1 && "max-w-none",
              )}
            >
              <span
                aria-hidden
                className="text-[2.75rem] leading-none transition-transform duration-200 group-active:scale-95 sm:text-[3.25rem]"
              >
                {option.icon}
              </span>
              <span className="text-base font-medium tracking-tight text-white/90 sm:text-lg">
                {option.title}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
