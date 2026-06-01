"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition, type ReactNode } from "react";

import { EventManagementHero } from "@/components/dashboard/event-management/event-management-hero";
import { cn } from "@/lib/utils";
import {
  EVENT_MANAGEMENT_SECTIONS,
  parseEventManagementSection,
  type EventManagementSectionId,
} from "@/lib/dashboard/event-management-sections";
import { routes } from "@/lib/routes";

type EventManagementShellProps = {
  eventName: string;
  eventSlug: string;
  publicPath: string;
  mediaCount: number;
  favoriteCount: number;
  totalLikes: number;
  lastUpdatedAt: string;
  sections: Record<EventManagementSectionId, ReactNode>;
};

function SectionNavButton({
  id,
  label,
  shortLabel,
  icon: Icon,
  active,
  onSelect,
  compact = false,
}: {
  id: EventManagementSectionId;
  label: string;
  shortLabel: string;
  icon: (typeof EVENT_MANAGEMENT_SECTIONS)[number]["icon"];
  active: boolean;
  onSelect: (id: EventManagementSectionId) => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition",
        compact ? "min-h-10 snap-start" : "w-full min-h-11 justify-start px-4",
        active
          ? "border-white/15 bg-white/10 text-white"
          : "border-transparent text-white/45 hover:border-white/8 hover:bg-white/[0.04] hover:text-white/75",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="size-4 shrink-0" />
      <span>{compact ? shortLabel : label}</span>
    </button>
  );
}

export function EventManagementShell({
  eventName,
  eventSlug,
  publicPath,
  mediaCount,
  favoriteCount,
  totalLikes,
  lastUpdatedAt,
  sections,
}: EventManagementShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const activeSection = parseEventManagementSection(searchParams.get("sec"));

  const setSection = useCallback(
    (section: EventManagementSectionId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("sec", section);

      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const activeMeta = EVENT_MANAGEMENT_SECTIONS.find(
    (section) => section.id === activeSection,
  );

  return (
    <main className="mx-auto max-w-7xl pb-16">
      <div className="mb-5">
        <Link
          href={routes.dashboard}
          className="text-sm font-semibold text-white/50 transition hover:text-white"
        >
          Voltar aos eventos
        </Link>
      </div>

      <div className="space-y-4">
        <EventManagementHero
          eventName={eventName}
          eventSlug={eventSlug}
          publicPath={publicPath}
          mediaCount={mediaCount}
          favoriteCount={favoriteCount}
          totalLikes={totalLikes}
          lastUpdatedAt={lastUpdatedAt}
        />

        <nav
          className="sticky top-0 z-20 -mx-1 overflow-x-auto bg-slate-950/90 px-1 pb-1 backdrop-blur-md lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Seções do evento"
        >
          <div className="flex min-w-max snap-x snap-mandatory gap-2">
            {EVENT_MANAGEMENT_SECTIONS.map((section) => (
              <SectionNavButton
                key={section.id}
                {...section}
                active={activeSection === section.id}
                onSelect={setSection}
                compact
              />
            ))}
          </div>
        </nav>
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:mt-8 lg:flex-row lg:items-start lg:gap-8">
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav
            className="sticky top-6 space-y-1 rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-2"
            aria-label="Seções do evento"
          >
            {EVENT_MANAGEMENT_SECTIONS.map((section) => (
              <SectionNavButton
                key={section.id}
                {...section}
                active={activeSection === section.id}
                onSelect={setSection}
              />
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-5 lg:hidden">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35">
              Seção
            </p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-white">
              {activeMeta?.label}
            </h2>
          </div>

          <div key={activeSection} className="animate-rise">
            {sections[activeSection]}
          </div>
        </div>
      </div>
    </main>
  );
}
