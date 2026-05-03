import Link from "next/link";
import type { GalleryEventRecord } from "@/types/event";
import { routes } from "@/lib/routes";

export type EventTile = GalleryEventRecord & {
  displayCover: string | null;
};

function formatCreatedLabel(iso: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function EventCard({ event, index }: { event: EventTile; index: number }) {
  return (
    <article
      className="animate-rise group relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.06] shadow-[0_28px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl transition duration-500 hover:-translate-y-2 hover:border-white/25 hover:bg-white/[0.09]"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <Link
        href={routes.event(event.slug)}
        className="relative block outline-none focus-visible:ring-4 focus-visible:ring-amber-300/45 active:scale-[0.99]"
      >
        <div className="relative aspect-[16/11] overflow-hidden rounded-[2.35rem]">
          {event.displayCover ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={event.displayCover}
                alt=""
                className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-3xl"
                aria-hidden="true"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={event.displayCover}
                alt={`Capa de ${event.name}`}
                className="relative z-[1] h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
              />
            </>
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_10%,rgba(251,191,36,0.35),transparent_42%),linear-gradient(145deg,rgba(99,102,241,0.35),rgba(15,23,42,0.92))]" />
          )}
          <div className="absolute inset-0 z-[2] bg-gradient-to-t from-black/82 via-black/35 to-transparent" />
          <div className="absolute left-7 top-7 z-[3] rounded-full border border-white/15 bg-black/45 px-5 py-2 text-xs font-semibold uppercase tracking-[0.26em] text-white/78 backdrop-blur-xl">
            {event.videosCount}{" "}
            {event.videosCount === 1 ? "vídeo" : "vídeos"}
          </div>
          <div className="absolute inset-x-0 bottom-0 z-[3] space-y-3 p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200/85">
              Criado em {formatCreatedLabel(event.createdAt)}
            </p>
            <h2 className="text-balance text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
              {event.name}
            </h2>
            <p className="text-base font-medium text-white/62">
              Toque para abrir a galeria deste evento
            </p>
          </div>
        </div>
      </Link>
    </article>
  );
}
