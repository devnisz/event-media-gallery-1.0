import Link from "next/link";

type EventGalleryEntryCtaProps = {
  eventHref: string;
};

export function EventGalleryEntryCta({ eventHref }: EventGalleryEntryCtaProps) {
  return (
    <Link
      href={eventHref}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-white/45 transition hover:text-white/75 active:opacity-80"
    >
      <span aria-hidden>←</span>
      Ver galeria completa
    </Link>
  );
}
