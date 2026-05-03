import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Admin",
  description: "Painel administrativo (em construção).",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminShell>
      <nav className="mb-10 flex flex-wrap gap-4 text-sm font-semibold text-white/55">
        <Link href={routes.home} className="hover:text-white">
          ← Voltar à galeria pública
        </Link>
      </nav>
      {children}
    </AdminShell>
  );
}
