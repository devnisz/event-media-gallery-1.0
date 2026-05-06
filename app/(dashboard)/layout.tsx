import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireSessionUser } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Painel",
  description: "Gestão de eventos e credenciais do watcher.",
};

export default async function DashboardGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireSessionUser();

  return (
    <AdminShell userEmail={user.email ?? user.id}>
      <nav className="mb-10 flex flex-wrap gap-4 text-sm font-semibold text-white/55">
        <Link href={routes.home} className="hover:text-white">
          ← Voltar à galeria pública
        </Link>
      </nav>
      {children}
    </AdminShell>
  );
}
