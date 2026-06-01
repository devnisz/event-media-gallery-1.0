import { CabineBreakdownCard } from "@/components/dashboard/engagement/event-engagement-dashboard";
import { EventVirtualBoothFrameForm } from "@/components/dashboard/event-virtual-booth-frame-form";
import { EventVirtualBoothSettingsForm } from "@/components/dashboard/event-virtual-booth-settings-form";
import type { EventEngagementMetrics } from "@/lib/dashboard/engagement-metrics";

type EventCabineSectionProps = {
  eventId: string;
  cabineBreakdown: EventEngagementMetrics["cabineBreakdown"];
  initialCabineVirtualEnabled: boolean;
  initialCabineVirtualPhotoEnabled: boolean;
  initialCabineVirtualBoomerangEnabled: boolean;
  initialCabineVirtualVideoEnabled: boolean;
  initialCabineVirtualVideoMaxDurationSeconds: number;
  initialCabineVirtualCameraEnabled: boolean;
  initialCabineVirtualGalleryImportEnabled: boolean;
  initialFrameUrl: string;
};

export function EventCabineSection({
  eventId,
  cabineBreakdown,
  initialCabineVirtualEnabled,
  initialCabineVirtualPhotoEnabled,
  initialCabineVirtualBoomerangEnabled,
  initialCabineVirtualVideoEnabled,
  initialCabineVirtualVideoMaxDurationSeconds,
  initialCabineVirtualCameraEnabled,
  initialCabineVirtualGalleryImportEnabled,
  initialFrameUrl,
}: EventCabineSectionProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-200">
          Experiência
        </p>
        <h2 className="text-2xl font-black tracking-tight text-white">
          Cabine virtual
        </h2>
        <p className="max-w-2xl text-sm text-white/45">
          Configure foto, vídeo, boomerang, molduras e demais opções da cabine.
        </p>
      </div>

      <EventVirtualBoothSettingsForm
        eventId={eventId}
        initialCabineVirtualEnabled={initialCabineVirtualEnabled}
        initialCabineVirtualPhotoEnabled={initialCabineVirtualPhotoEnabled}
        initialCabineVirtualBoomerangEnabled={initialCabineVirtualBoomerangEnabled}
        initialCabineVirtualVideoEnabled={initialCabineVirtualVideoEnabled}
        initialCabineVirtualVideoMaxDurationSeconds={
          initialCabineVirtualVideoMaxDurationSeconds
        }
        initialCabineVirtualCameraEnabled={initialCabineVirtualCameraEnabled}
        initialCabineVirtualGalleryImportEnabled={
          initialCabineVirtualGalleryImportEnabled
        }
      />

      <EventVirtualBoothFrameForm
        eventId={eventId}
        initialFrameUrl={initialFrameUrl}
      />

      <CabineBreakdownCard breakdown={cabineBreakdown} />
    </div>
  );
}
