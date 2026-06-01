import { EventMediaManager } from "@/components/dashboard/event-media-manager";
import { PendingGuestUploads } from "@/components/dashboard/pending-guest-uploads";
import type { GalleryMediaRecord } from "@/types/media";

type EventMediaSectionProps = {
  eventId: string;
  media: GalleryMediaRecord[];
  pendingGuestUploads: GalleryMediaRecord[];
};

export function EventMediaSection({
  eventId,
  media,
  pendingGuestUploads,
}: EventMediaSectionProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-rose-200/90">
          Biblioteca
        </p>
        <h2 className="text-xl font-black tracking-tight text-white">Mídias</h2>
        <p className="max-w-2xl text-sm text-white/45">
          Moderação, favoritos e visibilidade das mídias do evento.
        </p>
      </div>

      <PendingGuestUploads
        eventId={eventId}
        initialUploads={pendingGuestUploads}
      />

      <EventMediaManager initialMedia={media} />
    </div>
  );
}
