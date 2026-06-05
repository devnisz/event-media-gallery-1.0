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
          className="text-[1.65rem] font-semibold tracking-[-0.02em] text-white sm:text-[1.875rem]"
        >
          Escolha sua experiência
        </h2>
        <p className="mt-2.5 text-sm text-white/38 sm:text-[0.9375rem]">
          Como deseja criar sua lembrança?
        </p>
      </header>

      {errorMessage ? (
        <p
          role="alert"
          className="mt-6 w-full max-w-lg rounded-2xl border border-red-400/15 bg-red-400/[0.06] px-4 py-3 text-center text-sm font-medium text-red-200/90"
        >
          {errorMessage}
        </p>
      ) : null}

      <ul
        className={cn(
          "mt-9 grid w-full max-w-[22rem] grid-cols-2 gap-3 sm:mt-11 sm:max-w-[28rem] sm:gap-3.5",
          optionCount === 1 && "max-w-[11rem] grid-cols-1",
        )}
        aria-label="Experiências disponíveis"
      >
        {options.map((option, index) => {
          const Icon = option.Icon;

          return (
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
                  "group flex w-full flex-col items-center justify-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-8 transition-[transform,background-color,border-color] duration-200",
                  "min-h-[10rem] touch-manipulation select-none sm:min-h-[10.75rem] sm:rounded-[1.125rem] sm:py-9",
                  "hover:border-white/[0.1] hover:bg-white/[0.04] active:scale-[0.98] active:bg-white/[0.05]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950",
                  usesCenteredLastItem &&
                    index === optionCount - 1 &&
                    "max-w-[calc(50%-0.375rem)] sm:max-w-[calc(50%-0.4375rem)]",
                  optionCount === 1 && "max-w-none",
                )}
              >
                <span className="flex size-14 items-center justify-center rounded-2xl bg-white/[0.04] text-white/85 transition-colors duration-200 group-hover:bg-white/[0.07] sm:size-16">
                  <Icon
                    className="size-7 sm:size-8"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                </span>
                <span className="text-[0.9375rem] font-medium tracking-[-0.01em] text-white/88 sm:text-base">
                  {option.title}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
