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
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-rose-200">
          Biblioteca
        </p>
        <h2 className="text-2xl font-black tracking-tight text-white">Mídias</h2>
        <p className="max-w-2xl text-sm text-white/45">
          Gerencie uploads, moderação, favoritos e visibilidade das mídias do
          evento.
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
