import type { ReactNode } from "react";

/**
 * Shell mínimo do painel administrativo (sem auth nesta etapa).
 */
export function AdminShell({ children }: { children: ReactNode }) {  return (
    <div className="flex min-h-dvh flex-col bg-slate-950 text-white">
      <header className="border-b border-white/10 px-6 py-5 backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-200">
          Área restrita (futuro)
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight">Painel admin</h1>
      </header>
      <div className="flex-1 px-6 py-10">{children}</div>
    </div>
  );
}
