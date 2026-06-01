import { Suspense } from "react";

import { EventManagementClient } from "@/components/dashboard/event-management/event-management-client";
import { buildEventEngagementMetrics } from "@/lib/dashboard/engagement-metrics";
import { getDashboardEventDetail } from "@/lib/dashboard/queries";
import { getPublicGalleryEventSettings } from "@/lib/gallery/public-event-settings";
import { resolveLiveMomentsConfig } from "@/lib/live-moments/config";
import { resolveCabineVirtualConfig } from "@/lib/virtual-booth/event-config";
import { requireSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type DashboardEventPageProps = {
  params: Promise<{ id: string }>;
};

function EventManagementFallback() {
  return (
    <main className="mx-auto max-w-7xl pb-16">
      <div className="space-y-4">
        <div className="h-4 w-32 rounded-full bg-white/10" />
        <div className="h-24 rounded-[1.25rem] border border-white/10 bg-white/[0.04]" />
        <div className="h-10 rounded-full bg-white/10" />
        <div className="h-96 rounded-[1.25rem] border border-white/10 bg-white/[0.03]" />
      </div>
    </main>
  );
}

export default async function DashboardEventPage({
  params,
}: DashboardEventPageProps) {
  const user = await requireSessionUser();
  const { id } = await params;
  const detail = await getDashboardEventDetail(user.id, decodeURIComponent(id));
  const cabineConfig = resolveCabineVirtualConfig(detail.event);
  const liveMomentsConfig = resolveLiveMomentsConfig(detail.event);
  const gallerySettings = getPublicGalleryEventSettings(detail.event);
  const engagementMetrics = buildEventEngagementMetrics(detail.media);

  return (
    <Suspense fallback={<EventManagementFallback />}>
      <EventManagementClient
        detail={detail}
        engagementMetrics={engagementMetrics}
        cabineConfig={cabineConfig}
        liveMomentsConfig={liveMomentsConfig}
        gallerySettings={gallerySettings}
      />
    </Suspense>
  );
}
