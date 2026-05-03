import Link from "next/link";
import { routes } from "@/lib/routes";
import { EventCard, type EventTile } from "./event-card";

export function EventsGrid({ events }: { events: EventTile[] }) {
  if (events.length === 0) {
    return (
      <div className="animate-rise relative overflow-hidden rounded-[2.75rem] border border-white/10 bg-gradient-to-br from-white/[0.07] via-black/35 to-black/65 px-8 py-16 text-center shadow-[0_34px_110px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:px-14 sm:py-20">
        <div className="pointer-events-none absolute inset-0 opacity-55">
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-amber-400/25 blur-3xl" />
          <div className="absolute -right-16 bottom-6 h-80 w-80 rounded-full bg-violet-500/25 blur-3xl" />
        </div>
        <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-8">
          <div className="grid size-28 place-items-center rounded-[2rem] border border-white/15 bg-white/[0.06] text-5xl shadow-[0_18px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <span aria-hidden className="translate-y-1">
              ✨
            </span>
          </div>
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.34em] text-amber-200">
              Nada por aqui ainda
            </p>
            <h2 className="text-balance text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
              Nenhum evento público
            </h2>
            <p className="text-lg leading-8 text-white/62">
              Em breve, novas celebrações aparecerão aqui. Quando sua equipe
              publicar uma galeria, você poderá revisitá-la neste espaço.
            </p>
          </div>
          <Link
            href={routes.admin}
            className="inline-flex min-h-[3.75rem] items-center justify-center rounded-full bg-gradient-to-r from-amber-300 via-orange-400 to-fuchsia-500 px-14 text-lg font-black text-slate-950 shadow-[0_24px_90px_rgba(251,191,36,0.35)] transition duration-300 hover:brightness-105 active:scale-[0.97]"
          >
            Abrir painel admin
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-7 lg:gap-9">
      {events.map((event, index) => (
        <EventCard key={event.id} event={event} index={index} />
      ))}
    </div>
  );
}
