import Link from "next/link";
import { getAdminOverview } from "@/lib/admin/queries";
import { formatDateTime, formatStorage } from "@/lib/admin/format";

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
          Master Admin
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">
          Visão geral do SaaS
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">
          Métricas lidas no servidor com Service Role. A área do cliente,
          watcher e galeria pública continuam separados deste painel.
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
              ? "Soma de media.file_size_bytes."
              : "Rode o SQL da Fase 1 para habilitar a métrica."
          }
        />
      </section>

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
        <div className="border-b border-white/10 px-6 py-5">
          <h2 className="text-xl font-black tracking-tight">Usuários</h2>
          <p className="mt-1 text-sm text-white/45">
            Clique em um usuário para ver eventos e consumo por evento.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-[0.18em] text-white/45">
              <tr>
                <th className="px-6 py-4 font-bold">E-mail</th>
                <th className="px-6 py-4 font-bold">Role</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold">Eventos</th>
                <th className="px-6 py-4 font-bold">Mídias</th>
                <th className="px-6 py-4 font-bold">Armazenamento</th>
                <th className="px-6 py-4 font-bold">Último upload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {overview.users.map((user) => (
                <tr key={user.id} className="transition hover:bg-white/[0.04]">
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/users/${encodeURIComponent(user.id)}`}
                      className="font-bold text-amber-100 hover:text-amber-200"
                    >
                      {user.email}
                    </Link>
                    {user.name ? (
                      <p className="mt-1 text-xs text-white/40">{user.name}</p>
                    ) : null}
                  </td>
                  <td className="px-6 py-4 text-white/70">{user.role}</td>
                  <td className="px-6 py-4 text-white/70">{user.status}</td>
                  <td className="px-6 py-4 text-white/70">{user.eventCount}</td>
                  <td className="px-6 py-4 text-white/70">{user.mediaCount}</td>
                  <td className="px-6 py-4 text-white/70">
                    {formatStorage(
                      user.storageBytes,
                      overview.storageSizeAvailable,
                    )}
                  </td>
                  <td className="px-6 py-4 text-white/70">
                    {formatDateTime(user.lastUploadAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
