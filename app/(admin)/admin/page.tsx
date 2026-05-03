import { AdminEventsDashboard } from "@/components/admin/admin-events-dashboard";
import { readEvents } from "@/services/eventService";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const events = await readEvents();

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
