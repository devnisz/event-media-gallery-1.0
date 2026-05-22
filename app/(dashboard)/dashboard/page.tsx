import { DashboardEventsOverview } from "@/components/dashboard/dashboard-events-overview";
import { requireSessionUser } from "@/lib/auth/session";
import { getDashboardEventSummaries } from "@/lib/dashboard/queries";

export const dynamic = "force-dynamic";

export default async function DashboardHomePage() {
  const user = await requireSessionUser();
  const events = await getDashboardEventSummaries(user.id);

  return (
    <DashboardEventsOverview
      key={events.map((event) => event.id).join("|")}
      initialEvents={events}
    />
  );
}
