import Link from "next/link";

type EventGalleryEntryCtaProps = {
  eventName: string;
  eventHref: string;
};

export function EventGalleryEntryCta({
  eventName,
  eventHref,
}: EventGalleryEntryCtaProps) {
  return (
    <Link
      href={eventHref}
      className="group block w-full rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-5 text-center backdrop-blur-xl transition duration-300 hover:border-amber-200/30 hover:bg-white/[0.08] active:scale-[0.99] sm:rounded-[1.75rem] sm:px-6 sm:py-6"
    >
      <span
        aria-hidden
        className="mx-auto mb-3 block h-px w-12 bg-gradient-to-r from-transparent via-white/25 to-transparent"
      />
      <span className="block text-base font-black tracking-tight text-white sm:text-lg">
        <span aria-hidden className="mr-1.5">
          📸
        </span>
        Ver galeria completa
      </span>
      <span className="mt-2 block text-sm font-semibold text-amber-100/90 transition group-hover:text-amber-50">
        {eventName}
      </span>
      <span
        aria-hidden
        className="mx-auto mt-3 block h-px w-12 bg-gradient-to-r from-transparent via-white/25 to-transparent"
      />
    </Link>
  );
}
