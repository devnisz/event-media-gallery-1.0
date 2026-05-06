import type { ReactNode } from "react";
import { LogoutButton } from "@/components/admin/logout-button";

type AdminShellProps = {
  children: ReactNode;
  userEmail: string;
};

/**
 * Shell do painel (área autenticada).
 */
export function AdminShell({ children, userEmail }: AdminShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-950 text-white">
      <header className="border-b border-white/10 px-6 py-5 backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-200">
              Área autenticada
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight">
              Painel da galeria
            </h1>
            <p className="mt-1 text-sm text-white/50">{userEmail}</p>
          </div>
          <LogoutButton />
        </div>
      </header>
      <div className="flex-1 px-6 py-10">{children}</div>
    </div>
  );
}
