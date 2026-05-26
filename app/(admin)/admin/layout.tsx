import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { LogoutButton } from "@/components/admin/logout-button";
import { getMasterAdminAccess } from "@/lib/auth/admin";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Painel Administrativo · Galeria",
  description: "Painel administrativo para métricas e usuários da plataforma.",
};

function AccessDenied({ reason }: { reason: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-950 px-6 py-16 text-white">
      <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/[0.06] p-8 shadow-[0_28px_90px_rgba(0,0,0,0.28)]">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-rose-200">
          Acesso negado
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          Área exclusiva para administradores
        </h1>
        <p className="mt-4 text-sm leading-6 text-white/65">{reason}</p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href={routes.dashboard}
            className="rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-white/80 transition hover:border-white/30 hover:text-white"
          >
            Voltar ao painel
          </Link>
          <LogoutButton />
        </div>
      </section>
    </main>
  );
}

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const access = await getMasterAdminAccess(routes.admin);

  if (!access.ok) {
    return <AccessDenied reason={access.reason} />;
  }

  const { user, profile } = access.session;
  const label = profile.email ?? user.email ?? user.id;

  return (
    <AdminShell userEmail={label}>
      <nav className="mb-10 flex flex-wrap gap-4 text-sm font-semibold text-white/55">
        <Link href={routes.dashboard} className="hover:text-white">
          Voltar ao painel
        </Link>
        <Link href={routes.home} className="hover:text-white">
          Galeria pública
        </Link>
        <Link href={routes.admin} className="hover:text-white">
          Visão geral
        </Link>
        <Link href={routes.adminUsers} className="hover:text-white">
          Usuários
        </Link>
      </nav>
      {children}
    </AdminShell>
  );
}
