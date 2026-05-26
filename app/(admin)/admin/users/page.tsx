import Link from "next/link";
import { AdminUsersTable } from "@/components/admin/admin-users-table";
import { getAdminOverview } from "@/lib/admin/queries";
import { routes } from "@/lib/routes";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const overview = await getAdminOverview();

  return (
    <main className="space-y-10">
      <section>
        <Link
          href={routes.admin}
          className="text-sm font-semibold text-white/50 hover:text-white"
        >
          Voltar à visão geral
        </Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.35em] text-amber-200">
          Administração
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Usuários</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">
          Crie contas de clientes e operadores sem acessar manualmente o Supabase.
        </p>
      </section>

      <AdminUsersTable
        users={overview.users}
        storageSizeAvailable={overview.storageSizeAvailable}
        allowCreate
      />
    </main>
  );
}
