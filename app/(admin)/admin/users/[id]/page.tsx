import Link from "next/link";
import { RoleBadge, StatusBadge } from "@/components/admin/admin-badges";
import { UserProfileManagementForm } from "@/components/admin/user-profile-management-form";
import { getAdminUserDetail } from "@/lib/admin/queries";
import { formatDateTime, formatStorage } from "@/lib/admin/format";
import { routes } from "@/lib/routes";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getAdminUserDetail(decodeURIComponent(id));

  return (
    <main className="space-y-10">
      <section>
        <Link
          href={routes.adminUsers}
          className="text-sm font-semibold text-white/50 hover:text-white"
        >
          Voltar aos usuários
        </Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.35em] text-amber-200">
          Usuário
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">
          {detail.user.email}
        </h1>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">
              Perfil
            </p>
            <div className="mt-3">
              <RoleBadge role={detail.user.role} />
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">
              Situação
            </p>
            <div className="mt-3">
              <StatusBadge status={detail.user.status} />
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">
              Eventos
            </p>
            <p className="mt-3 text-lg font-black">{detail.user.eventCount}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">
              Armazenamento
            </p>
            <p className="mt-3 text-lg font-black">
              {formatStorage(
                detail.user.storageBytes,
                detail.storageSizeAvailable,
              )}
            </p>
          </div>
        </div>
      </section>

      <UserProfileManagementForm
        userId={detail.user.id}
        email={detail.user.email}
        currentRole={detail.user.role}
        currentStatus={detail.user.status}
      />

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
        <div className="border-b border-white/10 px-6 py-5">
          <h2 className="text-xl font-black tracking-tight">
            Eventos do usuário
          </h2>
          <p className="mt-1 text-sm text-white/45">
            Consumo agrupado por evento com base no proprietário do evento.
          </p>
        </div>

        {detail.events.length === 0 ? (
          <p className="px-6 py-10 text-sm text-white/50">
            Este usuário ainda não possui eventos.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-[0.18em] text-white/45">
                <tr>
                  <th className="px-6 py-4 font-bold">Evento</th>
                  <th className="px-6 py-4 font-bold">Criado em</th>
                  <th className="px-6 py-4 font-bold">Mídias</th>
                  <th className="px-6 py-4 font-bold">Armazenamento</th>
                  <th className="px-6 py-4 font-bold">Último upload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {detail.events.map((event) => (
                  <tr key={event.id} className="transition hover:bg-white/[0.04]">
                    <td className="px-6 py-4">
                      <p className="font-bold text-white">{event.name}</p>
                      <p className="mt-1 text-xs text-white/40">{event.slug}</p>
                    </td>
                    <td className="px-6 py-4 text-white/70">
                      {formatDateTime(event.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-white/70">
                      {event.mediaCount}
                    </td>
                    <td className="px-6 py-4 text-white/70">
                      {formatStorage(
                        event.storageBytes,
                        detail.storageSizeAvailable,
                      )}
                    </td>
                    <td className="px-6 py-4 text-white/70">
                      {formatDateTime(event.lastUploadAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
