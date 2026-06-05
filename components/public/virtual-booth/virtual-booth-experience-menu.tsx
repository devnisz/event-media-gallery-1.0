"use client";

import type { VirtualBoothMenuOption } from "@/lib/virtual-booth/capture-options";
import { cn } from "@/lib/utils";
import { boothSubtitleClass, boothTitleClass } from "./virtual-booth-ui";

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
    <div className="mx-auto flex w-full max-w-[24rem] flex-col items-center sm:max-w-[28rem]">
      <header className="w-full text-center">
        <h2
          id={titleId}
          className={cn(boothTitleClass, "text-[1.75rem] sm:text-[1.875rem]")}
        >
          Escolha sua experiência
        </h2>
        <p className={boothSubtitleClass}>Como deseja criar sua lembrança?</p>
      </header>

      {errorMessage ? (
        <p
          role="alert"
          className="mt-8 w-full rounded-2xl border border-red-400/15 bg-red-400/[0.06] px-4 py-3 text-center text-sm font-medium text-red-200/90"
        >
          {errorMessage}
        </p>
      ) : null}

      <ul
        className={cn(
          "mt-10 grid w-full grid-cols-2 gap-3.5 sm:mt-12 sm:gap-4",
          optionCount === 1 && "max-w-[12rem] grid-cols-1 justify-self-center",
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
                  "group flex w-full flex-col items-center justify-center gap-4 rounded-[1.125rem] border border-white/[0.07] bg-white/[0.025] px-3 py-9 transition-[transform,background-color,border-color] duration-200",
                  "min-h-[10.75rem] touch-manipulation select-none sm:min-h-[11.25rem] sm:rounded-2xl sm:py-10",
                  "hover:border-white/[0.11] hover:bg-white/[0.045] active:scale-[0.98] active:bg-white/[0.055]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950",
                  usesCenteredLastItem &&
                    index === optionCount - 1 &&
                    "max-w-[calc(50%-0.4375rem)] sm:max-w-[calc(50%-0.5rem)]",
                )}
              >
                <span className="flex size-[3.75rem] items-center justify-center rounded-[1rem] bg-white/[0.045] text-white/90 transition-colors duration-200 group-hover:bg-white/[0.075] sm:size-16 sm:rounded-[1.125rem]">
                  <Icon
                    className="size-[1.75rem] sm:size-8"
                    strokeWidth={1.35}
                    aria-hidden
                  />
                </span>
                <span className="text-[0.9375rem] font-medium tracking-[-0.015em] text-white/90 sm:text-base">
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
