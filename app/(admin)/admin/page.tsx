import { AdminUsersTable } from "@/components/admin/admin-users-table";
import { getAdminOverview } from "@/lib/admin/queries";
import { formatStorage } from "@/lib/admin/format";

export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/45">
        {label}
      </p>
      <p className="mt-4 text-3xl font-black tracking-tight text-white">
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-white/45">{hint}</p> : null}
    </article>
  );
}

export default async function AdminHomePage() {
  const overview = await getAdminOverview();

  return (
    <main className="space-y-10">
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-200">
          Administração
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">
          Visão geral da plataforma
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">
          Métricas consolidadas no servidor. A área do cliente, o watcher e a
          galeria pública continuam separados deste painel.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Usuários" value={String(overview.totalUsers)} />
        <StatCard label="Eventos" value={String(overview.totalEvents)} />
        <StatCard label="Mídias" value={String(overview.totalMedia)} />
        <StatCard
          label="Armazenamento"
          value={formatStorage(
            overview.storageBytes,
            overview.storageSizeAvailable,
          )}
          hint={
            overview.storageSizeAvailable
              ? "Soma dos tamanhos registrados nas mídias."
              : "Métrica indisponível até registrar tamanho das mídias."
          }
        />
      </section>

      <AdminUsersTable
        users={overview.users}
        storageSizeAvailable={overview.storageSizeAvailable}
      />
    </main>
  );
}
