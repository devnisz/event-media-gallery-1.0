"use client";

import { EventEngagementDashboard } from "@/components/dashboard/engagement/event-engagement-dashboard";
import { EventCabineSection } from "@/components/dashboard/event-management/sections/event-cabine-section";
import { EventMediaSection } from "@/components/dashboard/event-management/sections/event-media-section";
import { EventQrSection } from "@/components/dashboard/event-management/sections/event-qr-section";
import { EventSettingsSection } from "@/components/dashboard/event-management/sections/event-settings-section";
import { EventManagementShell } from "@/components/dashboard/event-management/event-management-shell";
import type { EventEngagementMetrics } from "@/lib/dashboard/engagement-metrics";
import type { DashboardEventDetail } from "@/lib/dashboard/queries";
import type { PublicGalleryEventSettings } from "@/lib/gallery/public-event-settings";
import type { LiveMomentsEventConfig } from "@/lib/live-moments/config";
import type { CabineVirtualEventConfig } from "@/lib/virtual-booth/event-config";

type EventManagementClientProps = {
  detail: DashboardEventDetail;
  engagementMetrics: EventEngagementMetrics;
  cabineConfig: CabineVirtualEventConfig;
  liveMomentsConfig: LiveMomentsEventConfig;
  gallerySettings: PublicGalleryEventSettings;
};

export function EventManagementClient({
  detail,
  engagementMetrics,
  cabineConfig,
  liveMomentsConfig,
  gallerySettings,
}: EventManagementClientProps) {
  const totalLikes = engagementMetrics.summary.likes.value;

  return (
    <EventManagementShell
      eventName={detail.event.name}
      eventSlug={detail.event.slug}
      publicPath={detail.publicPath}
      mediaCount={detail.mediaCount}
      favoriteCount={detail.favoriteCount}
      totalLikes={totalLikes}
      lastUpdatedAt={detail.lastUpdatedAt}
      sections={{
        overview: (
          <EventEngagementDashboard
            metrics={engagementMetrics}
            variant="overview"
          />
        ),
        media: (
          <EventMediaSection
            eventId={detail.event.id}
            media={detail.media}
            pendingGuestUploads={detail.pendingGuestUploads}
          />
        ),
        cabine: (
          <EventCabineSection
            eventId={detail.event.id}
            cabineBreakdown={engagementMetrics.cabineBreakdown}
            initialCabineVirtualEnabled={cabineConfig.enabled}
            initialCabineVirtualPhotoEnabled={cabineConfig.photo}
            initialCabineVirtualBoomerangEnabled={cabineConfig.boomerang}
            initialCabineVirtualVideoEnabled={cabineConfig.video}
            initialCabineVirtualVideoMaxDurationSeconds={
              cabineConfig.videoMaxDurationSeconds
            }
            initialCabineVirtualCameraEnabled={cabineConfig.cameraEnabled}
            initialCabineVirtualGalleryImportEnabled={
              cabineConfig.galleryImportEnabled
            }
            initialFrameUrl={detail.event.frameUrl ?? ""}
          />
        ),
        settings: (
          <EventSettingsSection
            eventId={detail.event.id}
            initialAllowPublicDelete={detail.event.allowPublicDelete}
            initialRequireDeletePin={detail.event.requireDeletePin}
            initialAllowGuestUpload={detail.event.allowGuestUpload}
            initialRequireGuestUploadApproval={
              detail.event.requireGuestUploadApproval
            }
            initialGalleryLayout={detail.event.galleryLayout}
            hasDeletePin={Boolean(detail.event.deletePinHash?.trim())}
            initialLiveMomentsEnabled={liveMomentsConfig.enabled}
            initialAllowLikes={gallerySettings.allowLikes}
            initialAllowMediaShare={gallerySettings.allowMediaShare}
          />
        ),
        qr: (
          <EventQrSection
            eventName={detail.event.name}
            publicUrl={detail.publicUrl}
          />
        ),
      }}
    />
  );
}
