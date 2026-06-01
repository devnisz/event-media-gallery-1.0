import { EventGallerySettingsForm } from "@/components/dashboard/event-gallery-settings-form";
import { EventInteractionsSettingsForm } from "@/components/dashboard/event-interactions-settings-form";
import { EventLiveMomentsSettingsForm } from "@/components/dashboard/event-live-moments-settings-form";
import type { GalleryLayout } from "@/lib/gallery/layout";

type EventSettingsSectionProps = {
  eventId: string;
  initialAllowPublicDelete: boolean;
  initialRequireDeletePin: boolean;
  initialAllowGuestUpload: boolean;
  initialRequireGuestUploadApproval: boolean;
  initialGalleryLayout: GalleryLayout;
  hasDeletePin: boolean;
  initialLiveMomentsEnabled: boolean;
  initialAllowLikes: boolean;
  initialAllowMediaShare: boolean;
};

export function EventSettingsSection({
  eventId,
  initialAllowPublicDelete,
  initialRequireDeletePin,
  initialAllowGuestUpload,
  initialRequireGuestUploadApproval,
  initialGalleryLayout,
  hasDeletePin,
  initialLiveMomentsEnabled,
  initialAllowLikes,
  initialAllowMediaShare,
}: EventSettingsSectionProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-violet-200">
          Preferências
        </p>
        <h2 className="text-2xl font-black tracking-tight text-white">
          Configurações
        </h2>
        <p className="max-w-2xl text-sm text-white/45">
          Layout da galeria, exclusão pública, curtidas, stories e uploads de
          convidados.
        </p>
      </div>

      <EventGallerySettingsForm
        eventId={eventId}
        initialAllowPublicDelete={initialAllowPublicDelete}
        initialRequireDeletePin={initialRequireDeletePin}
        initialAllowGuestUpload={initialAllowGuestUpload}
        initialRequireGuestUploadApproval={initialRequireGuestUploadApproval}
        initialGalleryLayout={initialGalleryLayout}
        hasDeletePin={hasDeletePin}
      />

      <EventLiveMomentsSettingsForm
        eventId={eventId}
        initialLiveMomentsEnabled={initialLiveMomentsEnabled}
      />

      <EventInteractionsSettingsForm
        eventId={eventId}
        initialAllowLikes={initialAllowLikes}
        initialAllowMediaShare={initialAllowMediaShare}
      />
    </div>
  );
}
