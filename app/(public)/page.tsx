import Link from "next/link";
import { connection } from "next/server";
import { AmbientBackground } from "@/components/public/ambient-background";
import { EventsGrid } from "@/components/public/events-grid";
import { routes } from "@/lib/routes";
import { enrichEventsWithCovers } from "@/services/videoService";
import { readEvents } from "@/services/eventService";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await connection();

  const events = await readEvents();
  const enriched = await enrichEventsWithCovers(events);

  const sorted = [...enriched].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <main className="relative min-h-dvh overflow-hidden px-5 py-8 text-white sm:px-8 lg:px-12 2xl:px-20">
      <AmbientBackground />

      <section className="mx-auto flex w-full max-w-[1900px] flex-col gap-10">
        <header className="animate-rise flex flex-col justify-between gap-8 rounded-[2.5rem] border border-white/10 bg-white/[0.06] p-7 shadow-[0_28px_90px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-10 xl:flex-row xl:items-end">
          <div className="max-w-5xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.36em] text-amber-200">
              Momentos que permanecem
            </p>
            <h1 className="text-5xl font-black tracking-[-0.05em] sm:text-7xl xl:text-8xl">
              Galerias disponíveis.
            </h1>
            <p className="mt-6 max-w-3xl text-xl leading-9 text-white/68 sm:text-2xl">
              Uma experiência premium para acessar e compartilhar os melhores
              momentos do evento.
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              href={routes.dashboard}
              className="inline-flex min-h-14 items-center justify-center rounded-full bg-gradient-to-r from-amber-300 via-orange-400 to-fuchsia-500 px-10 text-base font-black text-slate-950 shadow-[0_18px_70px_rgba(251,191,36,0.32)] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/40 active:scale-[0.98]"
            >
              Painel · criar eventos
            </Link>
            <div className="rounded-[2rem] border border-white/10 bg-black/25 px-8 py-5 text-center backdrop-blur-xl">
              <strong className="block text-4xl font-black tabular-nums">
                {sorted.length}
              </strong>
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
                eventos
              </span>
            </div>
          </div>
        </header>

        <EventsGrid events={sorted} />
      </section>
    </main>
  );
}
