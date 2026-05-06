import { AdminEventsDashboard } from "@/components/admin/admin-events-dashboard";
import { requireSessionUser } from "@/lib/auth/session";
import { readDashboardEvents } from "@/services/eventService";

export const dynamic = "force-dynamic";

export default async function DashboardHomePage() {
  const user = await requireSessionUser();
  const events = await readDashboardEvents(user.id);

  const sorted = [...events].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <AdminEventsDashboard
      key={sorted.map((e) => e.id).join("|")}
      initialEvents={sorted}
    />
  );
}
